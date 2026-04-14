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
/** 只索引正文目录，避免 daily/ 新闻量过大；可自行改 */
const CONTENT_ROOTS = [join(REPO_ROOT, 'content/posts')]

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

  const stub = {
    version: 1,
    embeddingModel: EMBEDDING_MODEL,
    baseUrl: BASE_URL,
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

  const files = []
  for (const root of CONTENT_ROOTS) {
    await walkMarkdownFiles(root, files)
  }
  files.sort()

  const plainChunks = []
  for (const file of files) {
    const raw = await readFile(file, 'utf8')
    const body = stripMarkdownNoise(stripFrontMatter(raw))
    const rel = relative(REPO_ROOT, file).replace(/\\/g, '/')
    for (const piece of chunkText(body)) {
      plainChunks.push({ source: rel, text: piece })
    }
  }

  console.log(`[build-rag] ${plainChunks.length} 个文本块，正在请求 Embedding（${EMBEDDING_MODEL}）…`)

  const embeddings = []
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

  const chunks = plainChunks.map((c, i) => ({
    source: c.source,
    text: c.text,
    embedding: embeddings[i],
  }))

  stub.chunks = chunks
  stub.generatedAt = new Date().toISOString()

  await writeFile(outPath, JSON.stringify(stub), 'utf8')
  console.log(`[build-rag] 已写入 ${outPath}（${chunks.length} 条向量）`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
