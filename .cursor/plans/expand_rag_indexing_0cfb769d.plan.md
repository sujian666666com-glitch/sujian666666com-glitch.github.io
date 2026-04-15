---
name: Expand RAG Indexing
overview: 扩大 RAG 索引范围至 content/daily 和 content/shrimp-diary，统一「文件路径 → URL」映射为通用规则，并加入基于文件哈希的增量索引以避免重复调用 Embedding API。
todos:
  - id: expand-roots
    content: 在 build-rag.mjs 中扩大 CONTENT_ROOTS 添加 daily 和 shrimp-diary
    status: pending
  - id: url-build
    content: 将 build-rag.mjs 的 postUrlFromRelative 替换为通用 contentUrlFromRelative
    status: pending
  - id: url-worker
    content: 将 chat-worker.js 的 postUrlFromSource 替换为通用 contentUrlFromSource
    status: pending
  - id: incremental
    content: 在 build-rag.mjs 中加入基于文件哈希的增量索引逻辑
    status: pending
isProject: false
---

# 扩大 RAG 索引范围并统一 URL 映射

## 现状

- [scripts/build-rag.mjs](scripts/build-rag.mjs) 只扫 `content/posts`（第 28 行 `CONTENT_ROOTS`）
- URL 映射函数 `postUrlFromRelative` 只认 `content/posts/...` 的正则（第 44-49 行）
- Worker 端 [static/chat-worker.js](static/chat-worker.js) 有同名函数 `postUrlFromSource`（第 125-131 行），做相同匹配——`content/daily` 和 `content/shrimp-diary` 的 chunk 落到这里 URL 一定为空

Hugo 没配自定义 permalinks，所有 section 都是默认 pretty URL 规则：

```
content/<section>/<path>.md  →  /<section>/<path>/
```

所以通用映射只需把 `content/` 前缀去掉、`.md` 后缀去掉、拼上 baseURL 和尾斜杠。

## 改动 1: 扩大 CONTENT_ROOTS

文件：[scripts/build-rag.mjs](scripts/build-rag.mjs) 第 27-28 行

```javascript
const CONTENT_ROOTS = [
  join(REPO_ROOT, 'content/posts'),
  join(REPO_ROOT, 'content/daily'),
  join(REPO_ROOT, 'content/shrimp-diary'),
]
```

当前 daily 约 45 篇、shrimp-diary 约 20 篇，增量不大，不会导致索引体积或 API 开销爆炸。

## 改动 2: 统一 URL 映射（build-rag.mjs）

把 `postUrlFromRelative` 替换为通用函数 `contentUrlFromRelative`：

```javascript
/** content/任意路径.md → 站点 URL（Hugo 默认 pretty URL） */
function contentUrlFromRelative(relPath, siteBase) {
  const base = (siteBase || '').replace(/\/$/, '')
  const m = relPath.replace(/\\/g, '/').match(/^content\/(.+)\.md$/i)
  if (!base || !m) return ''
  return `${base}/${m[1]}/`
}
```

同步把第 183 行的调用 `postUrlFromRelative(rel, siteBase)` 改为 `contentUrlFromRelative(rel, siteBase)`。

## 改动 3: 统一 URL 映射（chat-worker.js）

文件：[static/chat-worker.js](static/chat-worker.js) 第 124-131 行

把 `postUrlFromSource` 替换为同逻辑的通用版本：

```javascript
/** content/.../*.md → 页面 URL */
function contentUrlFromSource(source, baseRaw) {
  const base = (baseRaw && String(baseRaw).replace(/\/$/, '')) || ''
  const norm = String(source || '').replace(/\\/g, '/')
  const m = norm.match(/^content\/(.+)\.md$/i)
  if (!base || !m) return ''
  return `${base}/${m[1]}/`
}
```

同步把第 208 行的调用 `postUrlFromSource(c.source, publicBase)` 改为 `contentUrlFromSource(c.source, publicBase)`。

## 改动 4: 增量索引（本地可选）

在 `build-rag.mjs` 的 `main()` 中加入基于文件内容哈希的增量逻辑：

- 用 Node.js `crypto.createHash('sha256')` 对每个文件内容算哈希
- 旧索引 `rag-vectors.json` 已存在时，读入旧数据，建立 `source -> {hash, chunks[]}` 的映射
- 新文件列表中，若某文件哈希与旧记录一致，复用旧 chunk（含 embedding），不调 API
- 文件已删除的 chunk 自动丢弃（不在新文件列表中就不带入）
- 新增或修改的文件才请求 embedding

实现要点：

- 每个 chunk 加一个 `contentHash` 字段（同一文件的所有 chunk 共享该值）
- 对旧 JSON 按 `source + contentHash` 分组做查找
- 这样只有内容变化的文件才重算向量，其余直接复用

这一步只影响本地构建；CI 端由于 `static/rag-vectors.json` 在 `.gitignore` 中不提交，每次都是全量（除非以后加 CI cache，这次不做）。

## 不改的部分

- `hugo.yaml`、`wrangler.toml`、CI workflow 均无需改动
- `_index.md` 的过滤逻辑已在 `walkMarkdownFiles` 中处理，无需额外排除

