#!/usr/bin/env node
/**
 * 构建向量索引：扫描 Markdown → 切块 → DashScope Embedding API → static/rag-vectors.json
 *
 * 需要环境变量：DASHSCOPE_API_KEY（与 Worker / 百炼通用 sk- 一致）
 * 可选：DASHSCOPE_BASE_URL（默认北京 compatible-mode）
 *
 *   DASHSCOPE_API_KEY=sk-xxx node scripts/build-rag.mjs
 *
 * 未设置 KEY 时：写入空索引并退出 0（便于 CI 未配 secret 时仍能通过构建）
 */

import { readFile, writeFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = join(__dirname, '..')

const EMBEDDING_MODEL = 'text-embedding-v4'
const BASE_URL =
  process.env.DASHSCOPE_BASE_URL ||
  'https://dashscope.aliyuncs.com/compatible-mode/v1'
const CHUNK_SIZE = 900
const CHUNK_OVERLAP = 120
const MIN_CHUNK_LEN = 80
const CONTENT_ROOTS = [
  join(REPO_ROOT, 'content/posts'),
  join(REPO_ROOT, 'content/daily'),
  join(REPO_ROOT, 'content/shrimp-diary'),
]

function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

/** 读取 hugo.yaml 的 baseURL（无尾部 /），用于生成每篇文章 canonical 链接 */
async function readSiteBaseFromHugo() {
  try {
    const p = join(REPO_ROOT, 'hugo.yaml')
    const raw = await readFile(p, 'utf8')
    const m = raw.match(/^baseURL:\s*(.+)$/m)
    if (!m) return ''
    return m[1].trim().replace(/^["']|["']$/g, '').replace(/\/$/, '')
  } catch {
    return ''
  }
}

/** content/任意路径.md → 站点 URL（Hugo 默认 pretty URL） */
function contentUrlFromRelative(relPath, siteBase) {
  const base = (siteBase || '').replace(/\/$/, '')
  const m = relPath.replace(/\\/g, '/').match(/^content\/(.+)\.md$/i)
  if (!base || !m) return ''
  return `${base}/${m[1]}/`
}

function extractTitleFromFrontMatter(raw) {
  if (!raw.startsWith('---')) return ''
  const end = raw.indexOf('\n---\n', 3)
  if (end === -1) return ''
  const fm = raw.slice(3, end)
  for (const line of fm.split(/\r?\n/)) {
    const mat = line.match(/^\s*title:\s*(.*)$/)
    if (!mat) continue
    let v = mat[1].trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1).replace(/\\"/g, '"')
    }
    return v.trim()
  }
  return ''
}

function stripFrontMatter(raw) {
  if (!raw.startsWith('---')) return raw
  const rest = raw.slice(3)
  const end = rest.indexOf('\n---')
  if (end === -1) return raw
  return rest.slice(end + 4).replace(/^\r?\n/, '')
}

function stripMarkdownNoise(s) {
  return (
    s
      .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]+`/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function chunkText(text) {
  const t = text.replace(/\r\n/g, '\n').trim()
  if (t.length < MIN_CHUNK_LEN) return []
  if (t.length <= CHUNK_SIZE) return [t]
  const out = []
  let i = 0
  while (i < t.length) {
    const piece = t.slice(i, i + CHUNK_SIZE).trim()
    if (piece.length >= MIN_CHUNK_LEN) out.push(piece)
    i += CHUNK_SIZE - CHUNK_OVERLAP
    if (i >= t.length) break
  }
  return out
}

async function walkMarkdownFiles(dir, acc = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return acc
  }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue
      await walkMarkdownFiles(p, acc)
    } else if (e.isFile() && e.name.endsWith('.md') && !e.name.endsWith('_index.md')) {
      acc.push(p)
    }
  }
  return acc
}

async function embedBatch(apiKey, inputs) {
  const url = `${BASE_URL.replace(/\/$/, '')}/embeddings`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: inputs,
    }),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`embeddings ${res.status}: ${text.slice(0, 500)}`)
  }
  const json = JSON.parse(text)
  const list = json.data || []
  list.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  return list.map((d) => d.embedding)
}

async function main() {
  const apiKey = process.env.DASHSCOPE_API_KEY || ''
  const outPath = join(REPO_ROOT, 'static/rag-vectors.json')
  const siteBase = await readSiteBaseFromHugo()

  const stub = {
    version: 1,
    embeddingModel: EMBEDDING_MODEL,
    baseUrl: BASE_URL,
    /** 与 hugo baseURL 一致，供 Worker 补全旧索引链接 */
    siteBaseUrl: siteBase,
    generatedAt: new Date().toISOString(),
    chunks: [],
  }

  if (!apiKey) {
    console.warn(
      '[build-rag] 未设置 DASHSCOPE_API_KEY，写入空 rag-vectors.json（Worker 将跳过 RAG）',
    )
    await writeFile(outPath, JSON.stringify(stub), 'utf8')
    return
  }

  // ── 加载旧索引（增量构建） ──
  let oldMap = new Map() // source → { hash, chunks[] }
  try {
    const oldRaw = await readFile(outPath, 'utf8')
    const oldData = JSON.parse(oldRaw)
    if (oldData && Array.isArray(oldData.chunks)) {
      for (const c of oldData.chunks) {
        if (!c.source || !c.contentHash) continue
        if (!oldMap.has(c.source)) {
          oldMap.set(c.source, { hash: c.contentHash, chunks: [] })
        }
        oldMap.get(c.source).chunks.push(c)
      }
    }
  } catch {
    // 无旧索引或解析失败 → 全量构建
  }

  const files = []
  for (const root of CONTENT_ROOTS) {
    await walkMarkdownFiles(root, files)
  }
  files.sort()

  const reusedChunks = []
  const plainChunks = [] // 仅新增/修改的文件

  for (const file of files) {
    const raw = await readFile(file, 'utf8')
    const rel = relative(REPO_ROOT, file).replace(/\\/g, '/')
    const hash = sha256(raw)

    // 文件内容未变 → 复用旧向量
    const old = oldMap.get(rel)
    if (old && old.hash === hash) {
      reusedChunks.push(...old.chunks)
      continue
    }

    // 新增或修改的文件
    const title = extractTitleFromFrontMatter(raw)
    const body = stripMarkdownNoise(stripFrontMatter(raw))
    const url = contentUrlFromRelative(rel, siteBase)
    for (const piece of chunkText(body)) {
      plainChunks.push({ source: rel, text: piece, title, url, contentHash: hash })
    }
  }

  console.log(
    `[build-rag] 复用 ${reusedChunks.length} 条旧向量，` +
    `${plainChunks.length} 个文本块需要重新 Embedding（${EMBEDDING_MODEL}）…`,
  )

  const embeddings = []
  if (plainChunks.length > 0) {
    const batchSize = 8
    for (let i = 0; i < plainChunks.length; i += batchSize) {
      const batch = plainChunks.slice(i, i + batchSize)
      const texts = batch.map((c) => c.text)
      const vecs = await embedBatch(apiKey, texts)
      if (vecs.length !== batch.length) {
        throw new Error('embedding 返回条数与请求不一致')
      }
      embeddings.push(...vecs)
      await new Promise((r) => setTimeout(r, 120))
    }
  }

  const newChunks = plainChunks.map((c, i) => ({
    source: c.source,
    text: c.text,
    title: c.title || '',
    url: c.url || '',
    contentHash: c.contentHash,
    embedding: embeddings[i],
  }))

  const chunks = [...reusedChunks, ...newChunks]

  stub.chunks = chunks
  stub.siteBaseUrl = siteBase
  stub.generatedAt = new Date().toISOString()

  await writeFile(outPath, JSON.stringify(stub), 'utf8')
  console.log(`[build-rag] 已写入 ${outPath}（${chunks.length} 条向量，其中 ${reusedChunks.length} 条复用）`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
