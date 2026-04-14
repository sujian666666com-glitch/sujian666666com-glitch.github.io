---
name: sw-aegis-flow
description: 端到端完成 OpenSpec spec-driven 闭环：JSON 驱动 + 受控提问协议。子 agent 落盘结构化 result.json，主 agent 只消费 JSON 做编排决策；遇到阻塞或偏好问题，子 agent 产出 question.json，主 agent 在同步点批量汇总后统一转问用户。
license: MIT
compatibility: Requires OpenSpec CLI and at least one of Codex CLI / Claude CLI. When neither is available, degrade to single-agent sequential execution.
metadata:
  author: swclaw
  version: "5.2"
---

# Sw Aegis Flow

把 OpenSpec 默认 `spec-driven` 工作流收敛成一条连续主线：

`new/continue change -> proposal/specs/design/tasks -> 文档快照(stp1) -> 并发审核 -> 审核后快照(stp2) -> apply -> batch并发实现(stp3+) -> 测试验收 -> 归档(stp-last)`

默认执行策略是 **双子 agent（Codex CLI + Claude CLI）多实例并发 + JSON 驱动编排**：子 agent 的所有产出（审核、实现、集成复核、测试）均落盘为 `result.json`；主 agent 只消费结构化 JSON 做阶段门禁和推进决策，不再将子 agent 自然语言输出塞入上下文。遇到硬阻塞或关键偏好时，子 agent 额外产出 `question.json`，由主 agent 在同步点批量汇总后统一转问用户。

Codex 为优先子 agent，当任务总数 >= 10 时启用 Claude CLI 分流。两者均不可用时，降级为主 agent 内串行完成。

## 双子 agent 并发执行模型

通过 `codex` 和 `claude` 命令行工具拉起独立 agent 实例，取代固定子 agent 池。每个实例是独立进程，天然支持并发，不依赖宿主平台的子 agent 能力。

### 子 agent 选择策略

```text
IF tasks.md 中待完成任务总数 < 10:
    全部使用 codex
ELSE:
    codex 为主（占约 60-70% 任务）
    claude 分流剩余任务（占约 30-40%）
    同一 batch 内可混用 codex 和 claude 实例
```

- 选择在 batch 规划阶段一次性确定，不在运行中动态切换
- 审核场景（artifact 审核、集成复核）仍全用 codex（只读、稳定性优先）
- 只有**实现场景**在任务总数 >= 10 时才使用 claude 分流

### 标准调用格式

**Codex CLI（优先）**

```bash
codex --approval-mode full-auto -q "<prompt>"
```

**Claude CLI（溢出分流）**

```bash
claude -p "<prompt>" --allowedTools "Read,Edit,Bash"
```

- `-p` = 非交互模式，执行完输出到 stdout 后退出
- `--allowedTools` 控制可用工具：审核场景只给 `Read`；实现场景给 `Read,Edit,Bash`
- 如需指定模型，使用 `claude -p "<prompt>" --model <model>`，由调用者决定

### 并发场景

| 场景 | 子 agent | 并发粒度 |
|------|----------|----------|
| Artifact 审核 | codex | 最多 4 个并发（proposal/specs/design/tasks） |
| 最终一致性复审 | codex | 单实例 |
| Batch 内任务实现 | codex 优先；任务总数 >= 10 时混用 claude | 按 batch 内任务数 |
| 集成复核 | codex | 单实例 |

### 调用模板

所有子 agent 调用的 prompt 末尾必须包含 JSON 输出路径指令和 stdout 约束。

```bash
# 审核单个 artifact（codex）
codex --approval-mode full-auto -q "请只读审核 openspec/changes/<name>/<artifact>.md，\
检查与 change 目标和前序 artifact 的一致性。不要修改任何文件。\
将审核结果写入 <run-dir>/reviews/round-<n>/<artifact>.result.json，\
格式遵循 schema_version 5.2 的 artifact_review 协议。\
stdout 只打印 RESULT_JSON=<绝对路径>。\
如果遇到需要用户决策的阻塞问题，额外写入 <run-dir>/questions/review--<artifact>.question.json，\
并在 stdout 追加 QUESTION_JSON=<绝对路径>。" &

# 最终一致性复审（codex）
codex --approval-mode full-auto -q "请只读复审 openspec/changes/<name>/ 下的 \
proposal、specs、design、tasks 最终版本。重点检查四者一致性，\
是否存在阻塞实现或验收的问题。不要修改文件。\
将复审结果写入 <run-dir>/final-review/round-<n>.result.json，\
格式遵循 schema_version 5.2 的 final_review 协议。\
stdout 只打印 RESULT_JSON=<绝对路径>。"

# 并发实现任务（codex）
codex --approval-mode full-auto -q "请实现 OpenSpec 任务 <task-id>，\
严格遵循 openspec/changes/<name>/ 下的 proposal、specs、design、tasks。\
完成后将 tasks.md 对应项标记为 [x]。只修改以下文件范围：<file-list>。\
将执行结果写入 <run-dir>/tasks/batch-<n>/<task-id>.result.json，\
格式遵循 schema_version 5.2 的 task_execution 协议。\
stdout 只打印 RESULT_JSON=<绝对路径>。\
如果遇到需要用户决策的阻塞问题，额外写入 <run-dir>/questions/apply--<task-id>.question.json，\
并在 stdout 追加 QUESTION_JSON=<绝对路径>。" &

# 并发实现任务（claude，任务总数 >= 10 时启用）
claude -p "请实现 OpenSpec 任务 <task-id>，\
严格遵循 openspec/changes/<name>/ 下的 proposal、specs、design、tasks。\
完成后将 tasks.md 对应项标记为 [x]。只修改以下文件范围：<file-list>。\
将执行结果写入 <run-dir>/tasks/batch-<n>/<task-id>.result.json，\
格式遵循 schema_version 5.2 的 task_execution 协议。\
stdout 只打印 RESULT_JSON=<绝对路径>。\
如果遇到需要用户决策的阻塞问题，额外写入 <run-dir>/questions/apply--<task-id>.question.json，\
并在 stdout 追加 QUESTION_JSON=<绝对路径>。" \
--allowedTools "Read,Edit,Bash" &

# 集成复核（codex）
codex --approval-mode full-auto -q "请检查以下文件的接口一致性和回归风险：<file-list>。\
只读审核，不修改文件。\
将复核结果写入 <run-dir>/integration/batch-<n>.result.json，\
格式遵循 schema_version 5.2 的 integration_review 协议。\
stdout 只打印 RESULT_JSON=<绝对路径>。"
```

### 并发控制

- 使用 Shell `&` 后台运行多个子 agent 实例，`wait` 收齐全部结果
- 审核实例只读，不修改文件，天然无冲突
- 实现实例之间必须先做文件级冲突分析，确保写入范围不重叠
- 如需指定模型，使用 `codex --model <model>` 或 `claude -p "<prompt>" --model <model>`，由调用者决定
- codex 与 claude 实例可在同一 batch 内混用，`wait` 统一收齐
- `wait` 完成后，主 agent 只读取 `result.json` 和 `question.json`，不解析子 agent stdout 的自然语言内容

## 运行态目录与命名

每次 Aegis Flow 执行生成独立运行目录，所有子 agent 产出的 JSON 文件均落在此目录下。

### 目录位置

```text
openspec/changes/<change>/.runs/<run-id>/
```

### run-id 格式

固定格式：`YYYYMMDDTHHMMSSZ-<8hex>`

示例：`20260413T142305Z-a1b2c3d4`

主 agent 在流程启动时一次性生成 `run-id`，传递给所有子 agent 调用。

### 固定子目录结构

```text
.runs/<run-id>/
├── reviews/
│   └── round-<n>/
│       └── <artifact>.result.json
├── final-review/
│   └── round-<n>.result.json
├── tasks/
│   └── batch-<n>/
│       └── <task-id>.result.json
├── integration/
│   └── batch-<n>.result.json
├── tests/
│   └── summary.result.json
└── questions/
    └── <stage>--<subject>.question.json
```

### 文件名安全化

文件名中的 `task-id`、`subject` 等动态部分做安全化处理：非 `[A-Za-z0-9._-]` 字符统一替换为 `_`。

### Git 排除

`.runs/` 目录已在根 `.gitignore` 中排除（`openspec/changes/*/.runs/`），不进入 `git status`、文档快照提交和归档提交。

## JSON 接口协议

所有子 agent 产出使用统一的 JSON 结构，主 agent 通过这些结构化数据做编排决策。

### result.json 统一外壳

```json
{
  "schema_version": "5.2",
  "run_id": "<run-id>",
  "change": "<change-name>",
  "kind": "artifact_review | final_review | task_execution | integration_review | test_report",
  "stage": "review | final_review | apply | integration | test",
  "subject": "<artifact 名 | task-id | batch 编号 | test 名>",
  "agent": {
    "engine": "codex | claude | main",
    "mode": "read_only | edit"
  },
  "status": "pass | needs_revision | blocked | failed",
  "blocking": true,
  "summary": "1-3 句中文摘要",
  "payload": { },
  "question_refs": ["questions/review--proposal.question.json"],
  "created_at": "2026-04-13T14:23:05Z"
}
```

公共字段说明：

| 字段 | 说明 |
|------|------|
| `schema_version` | 固定 `"5.2"` |
| `run_id` | 本次运行的唯一标识 |
| `change` | change 名称 |
| `kind` | 产出类型枚举 |
| `stage` | 所处阶段 |
| `subject` | 具体对象（artifact 名、task-id、batch 编号等） |
| `agent` | 执行引擎和模式 |
| `status` | 结果状态 |
| `blocking` | 布尔值；主 agent 的严格门禁以 `blocking` 和 `status` 为准 |
| `summary` | 人类可读的简短摘要 |
| `payload` | 场景化内容，见下 |
| `question_refs` | 关联的 `question.json` 相对路径数组；没有则为空数组 `[]` |
| `created_at` | ISO 8601 UTC 时间 |

### payload 场景化定义

**artifact_review / final_review**

```json
{
  "severe_issues": ["..."],
  "general_issues": ["..."],
  "suggestions": ["..."]
}
```

**task_execution**

```json
{
  "completed_tasks": ["task-id-1"],
  "changed_files": ["src/lib/foo.ts", "src/db/schema.ts"],
  "tests_run": ["npm run test -- --grep foo"],
  "risks": ["..."],
  "followups": ["..."]
}
```

**integration_review**

```json
{
  "checked_files": ["src/lib/foo.ts"],
  "compat_risks": ["..."],
  "required_fixes": ["..."]
}
```

**test_report**

```json
{
  "commands": ["cd admin && npm run test"],
  "passed_checks": ["..."],
  "failed_checks": ["..."],
  "coverage_notes": "..."
}
```

### question.json 统一结构

```json
{
  "schema_version": "5.2",
  "run_id": "<run-id>",
  "change": "<change-name>",
  "stage": "review | apply | integration | test",
  "subject": "<artifact 或 task-id>",
  "severity": "blocking | preference",
  "question": "需要用户决策的问题",
  "why": "为什么需要问这个问题",
  "options": [
    { "id": "a", "label": "选项 A", "impact": "影响说明" },
    { "id": "b", "label": "选项 B", "impact": "影响说明" }
  ],
  "recommended_option": "a",
  "default_if_no_answer": "a",
  "blocks": ["task-id-3", "task-id-5"],
  "created_at": "2026-04-13T14:23:05Z"
}
```

字段说明：

| 字段 | 说明 |
|------|------|
| `severity` | `blocking`：阻塞后续推进；`preference`：有默认值可继续 |
| `options` | 每项含 `id`、`label`、`impact` |
| `recommended_option` | 推荐选项的 `id` |
| `default_if_no_answer` | 用户未回答时的默认选项 `id` |
| `blocks` | 被阻塞的 artifact/task-id 列表 |

### 子 agent stdout 约束

子 agent 的 stdout 收敛为单行机器友好输出，不再回灌完整自然语言到主 agent 上下文：

```text
RESULT_JSON=/absolute/path/to/.runs/<run-id>/reviews/round-1/proposal.result.json
QUESTION_JSON=/absolute/path/to/.runs/<run-id>/questions/review--proposal.question.json
```

- 必打印：`RESULT_JSON=<绝对路径>`
- 有提问时追加：`QUESTION_JSON=<绝对路径>`
- 禁止在 stdout 输出审核/实现长文本摘要

## 受控提问协议

子 agent 不直接向用户发问。所有需要用户决策的问题通过 `question.json` 落盘，由主 agent 汇总中转。

### 工作机制

1. 子 agent 遇到硬阻塞（`severity: blocking`）或关键偏好（`severity: preference`）时，写入 `questions/<stage>--<subject>.question.json`
2. 子 agent 在 `result.json` 的 `question_refs` 中引用该 question 的相对路径
3. 主 agent 在同步点（`wait` 收齐后）批量读取所有 `question.json`
4. 主 agent 将同一同步点的多个问题合并成一轮提问，统一向用户发问
5. 用户回答后，主 agent 根据回答更新受影响的任务或审核，继续推进

### 阻塞隔离

- `severity: blocking` 的问题只暂停 `blocks` 字段列出的 artifact/task；不冻结不相关的任务或审核
- `severity: preference` 的问题有 `default_if_no_answer`，在用户未回答时自动采用默认选项，不阻塞推进
- 主 agent 在批次同步点批量汇总所有问题后统一向用户发问，不逐个中断

## 何时使用

- 用户希望从一个变更描述直接推进到 OpenSpec 闭环完成
- 用户希望减少在多个 `openspec-*` skill 或多个命令之间手动切换
- 用户希望先完成文档，再统一审核，再进入实现
- 用户希望实现前保留一份文档快照，避免文档与代码脱节
- 用户希望按任务依赖关系推进实现，而不是无序开发

## 不适用范围

- 用户明确要求的不是 OpenSpec 默认 `spec-driven` workflow
- 用户只想做单一步骤，例如仅创建 proposal、仅补 tasks、仅归档
- 用户要求交互式、逐步确认式流程，而不是连续推进式流程

## 输入要求

用户输入应至少包含以下之一：

- 清晰的变更目标或 bug 修复描述
- 已存在的 change 名称

如果目标完全不清楚，先询问一次高价值澄清问题；除该场景外，默认持续推进，不因中间步骤反复向用户确认。

## 能力要求与降级策略

### 必需能力

- 能执行 OpenSpec CLI
- 能读写仓库文件
- 能进行基本的代码修改与测试

### 默认执行能力

- Codex CLI（`codex` 命令可用）— 优先子 agent
- Claude CLI（`claude` 命令可用）— 溢出分流子 agent
- 并发启动多个子 agent 实例

### 其他可选能力

- 自动待办跟踪
- 自动 git 提交
- 自动测试与重试

### 降级规则

1. **Codex + Claude 均可用** → 按子 agent 选择策略混用（任务总数 >= 10 时启用 claude 分流）
2. **Codex 可用但 Claude 不可用** → 回退到仅 codex 模式
3. **Codex 不可用但 Claude 可用** → 全部使用 `claude -p` 替代 codex
4. **两者均不可用**（未安装、无网络、无 API Key）→ 降级为主 agent 内串行执行全部审核与实现任务
5. **不支持并发执行**（环境限制无法后台启动多进程）→ 仍先做依赖分析和批次规划，按 batch 串行执行
6. **不支持自动 git 提交** → 必须明确记录文档快照提交时机和建议命令
7. **不支持自动化测试** → 必须至少记录建议测试命令、重点验收场景和未验证风险

## 工作流

### 0. 初始化运行目录

流程启动时，主 agent 生成 `run-id` 并创建运行目录：

```bash
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$(openssl rand -hex 4)"
RUN_DIR="openspec/changes/<name>/.runs/${RUN_ID}"
mkdir -p "${RUN_DIR}"/{reviews,final-review,tasks,integration,tests,questions}
```

后续所有子 agent 调用中的 `<run-dir>` 均替换为此 `RUN_DIR`。

### 1. 识别需求并确定 change

1. 如果用户已给出 change 名称，直接使用。
2. 如果只有自然语言目标，派生一个 kebab-case change 名称。
3. 如果目标完全不清楚，先问一次用户要构建或修复什么。
4. 执行：

```bash
openspec new change "<name>"
```

5. 进入后续阶段，不等待额外确认。

如果 change 已存在，优先继续该 change，避免创建重复 change。

### 2. 建立 artifact 计划

执行：

```bash
openspec status --change "<name>" --json
```

从状态中识别：

- 当前 schema 名称
- `apply.requires`
- artifact 列表、状态、依赖关系

如果 schema 不是 `spec-driven`，记录"当前 workflow 不受本 skill 覆盖"并结束本次运行；这属于边界外场景，不属于流程性暂停。

### 3. 连续生成 artifact

按默认顺序推进：

`proposal -> specs -> design -> tasks`

对每个已满足依赖、状态为 `ready` 的 artifact：

1. 执行：

```bash
openspec instructions <artifact-id> --change "<name>" --json
```

2. 读取依赖 artifact
3. 根据 `template`、`instruction`、`context`、`rules` 生成目标文件
4. 写入文件并校验文件已存在
5. 生成完成后立即启动 codex 实例进行只读审核（后台运行），prompt 包含 JSON 输出指令（见调用模板）：

```bash
codex --approval-mode full-auto -q "请只读审核 openspec/changes/<name>/<artifact>.md，... \
将审核结果写入 ${RUN_DIR}/reviews/round-1/<artifact>.result.json，..." &
```

规则：

- `template` 是输出结构
- `instruction` 是该 artifact 的内容指导
- `context` 和 `rules` 是生成约束，不应原样写入文件
- 后续 artifact 生成前必须先读取前置 artifact

### 4. 提交未审核 artifact

所有 artifact 生成完成后、进入审核前，先提交一份原始文档快照，确保未审核版本有据可查。

推荐命令：

```bash
git add openspec/changes/<name>/
git commit -m 'docs(openspec): <name> stp1: 提交 <change 中文简述> 原始文档

change-id: <name>
- <按实际生成的 artifact 逐条列出，每条一行简述>'
```

规则：

- 提交范围只包含 `openspec/changes/<name>/`，不包含 `.runs/`（已被 `.gitignore` 排除）
- bullet 内容必须根据实际生成的 artifact 动态组装，禁止硬编码
- 如果 git 提交失败，记录失败原因和建议操作，但不阻塞后续审核

### 5. 审核与统一修订

使用 `wait` 收齐 Step 3 中后台启动的所有 codex 审核实例，然后**只读取对应的 `result.json`** 进行判定。

如果 Step 3 未并发启动审核（降级模式），则在此步骤串行执行审核。

**门禁判定**

对每个 `result.json`：

- `blocking == true` 或 `status in {needs_revision, blocked, failed}` → 不进入下一步，进入统一修订
- 全部 `status == pass` 且 `blocking == false` → 审核通过

**question.json 汇总**

`wait` 收齐后，检查所有 `result.json` 的 `question_refs`：

- 读取引用的 `question.json` 文件
- 将同一轮的多个问题合并成一轮提问，统一向用户发问
- `severity: preference` 的问题在用户未回答时自动采用 `default_if_no_answer`

**审核规则**

- 审核总轮数上限为 2 轮
- 审核阶段只提出问题，不直接修改文档
- 不要边收到意见边改
- 必须等同一轮意见收齐后统一修订
- 修订时要联动检查 proposal、specs、design、tasks 的一致性
- 修订后如需再次审核，再拉起一轮 codex 实例（轮次号递增：`round-2`）

最终一致性复审（可选，建议执行）：

```bash
codex --approval-mode full-auto -q "请只读复审 openspec/changes/<name>/ 下全部 artifact... \
将复审结果写入 ${RUN_DIR}/final-review/round-<n>.result.json，..."
```

详细审核清单和 JSON 聚合规则见 `references/review-checklist.md`。

### 6. 审核后提交文档快照

审核通过，或达到 2 轮上限后，进入 apply 前应保留一份审核后文档快照。

推荐命令：

```bash
git add openspec/changes/<name>/
git commit -m 'docs(openspec): <name> stp2: 提交 <change 中文简述> 审核后文档快照

change-id: <name>
- <按实际 artifact 逐条列出修订要点或确认通过>'
```

标题中的标签规则：

- 审核通过：不需要额外标签
- 达到 2 轮上限仍有遗留：在 bullet 末尾追加 `- 遗留问题: <简述>`

规则：

- 提交范围只包含 `openspec/changes/<name>/`，不包含 `.runs/`
- bullet 内容必须根据实际审核修订情况动态组装，禁止硬编码
- 如果 git 提交失败，记录失败原因和建议操作，但不阻塞后续实现

### 7. 进入实现阶段

执行：

```bash
openspec instructions apply --change "<name>" --json
```

读取 `contextFiles` 并理解 proposal、specs、design、tasks。

如果 apply 状态已是 `all_done`，直接跳到测试或归档判断；如果状态是 `blocked`，说明缺少前置 artifact，应记录阻塞原因，并将其视为当前运行的硬性失败而不是流程性暂停。

### 8. 任务依赖分析与批次执行

在修改代码前，先分析 `tasks.md` 中所有待完成任务的依赖关系，并输出任务执行计划，再开始实现。

详细批次划分规则、并发判定标准见 `references/batch-planning.md`。

**并发实现**

同一 batch 内互不冲突的任务，每个启动一个子 agent 实例并发实现（按选择策略分配 codex 或 claude），所有 prompt 包含 JSON 输出路径指令：

```bash
codex --approval-mode full-auto -q "请实现 OpenSpec 任务 <task-id>，... \
将执行结果写入 ${RUN_DIR}/tasks/batch-<n>/<task-id>.result.json，..." &
claude -p "请实现 OpenSpec 任务 <task-id>，... \
将执行结果写入 ${RUN_DIR}/tasks/batch-<n>/<task-id>.result.json，..." \
--allowedTools "Read,Edit,Bash" &
wait
```

**result.json 消费与 question.json 批量汇总**

`wait` 完成后：

1. 逐个读取 `${RUN_DIR}/tasks/batch-<n>/<task-id>.result.json`
2. 检查 `status` 和 `blocking`：
   - `pass` → 该 task 进入主 agent 审查
   - `blocked` → 检查 `question_refs`，只暂停该 task，不冻结不相关 task
   - `failed` → 记录失败，不阻塞其他 task
3. 收集所有 `question_refs` 指向的 `question.json`
4. 在本批次同步点，将所有问题合并成一轮提问，统一向用户发问
5. 用户回答后，对受阻 task 重新拉起子 agent（或主 agent 手动修复）

**每 task 主 agent 审查**

batch 内 `status == pass` 的 task，由**主 agent**逐 task 审查改动（参考 `result.json` 中的 `changed_files` 和 `risks`），确认实现质量后再进入集成复核。

审查流程：

1. 按 task 列表顺序，逐个审查本 batch 内已完成的 task
2. 审查内容：
   - 改动是否在 task 声明的文件范围内（对照 `result.json` 的 `changed_files`）
   - 实现是否符合 specs/design 预期
   - 是否引入明显回归风险（对照 `result.json` 的 `risks`）
3. 审查通过 → 继续下一个 task
4. 审查不通过 → 记录问题 → 修改代码 → 再次审查
5. **单 task 审查循环上限 2 轮**（与 §5 文档审核同构）
6. 达到 2 轮仍有遗留 → 记录遗留问题，继续下一个 task

审查规则：

- 审查与修改分离：先完整列出问题，再统一修改
- 主 agent 直接审查代码改动，不启动额外子 agent 实例
- 降级模式下（主 agent 串行实现）同样适用每 task 审查

**集成复核**

本 batch 全部 task 通过主 agent 审查后，启动一个 codex 实例检查接口一致性，产出 `integration_review.result.json`：

```bash
codex --approval-mode full-auto -q "请检查以下文件的接口一致性和回归风险：<file-list>。\
只读审核，不修改文件。\
将复核结果写入 ${RUN_DIR}/integration/batch-<n>.result.json，..."
```

集成复核门禁：读取 `integration/batch-<n>.result.json`，任何 `status in {failed, blocked}` 或 `blocking == true` 都阻断后续 batch 和归档。

实现规则：

- 完成任务后回写 `tasks.md`，将对应任务标记为 `[x]`
- 不得把会写同一文件或明显共享接口的任务放在同一并发 batch
- 每个子 agent 实例必须明确写入负责文件范围，不得越界修改其他实例的文件
- 每 task 必须通过主 agent 审查后，才进入集成复核
- 集成复核通过后再进入下一批次
- 如果子 agent CLI 均不可用，仍按 batch 顺序执行，batch 内由主 agent 串行完成

#### 实现提交

每完成一个 batch 后建议提交一次，提交粒度按 batch 而非全部完成后一次性提交。

推荐命令：

```bash
git add <本 batch 修改的代码文件> openspec/changes/<name>/tasks.md
git commit -m '<type>(<scope>): <name> stp<N>: <本 batch 中文简述>

change-id: <name>
- <逐条列出本 batch 完成的任务编号和摘要>'
```

规则：

- `<scope>` 根据实际改动模块确定（如 `admin`、`docker`、`lib` 等）
- `type` 根据改动性质选择：`feat`（新功能）、`fix`（修复）、`refactor`（重构）
- `stp<N>` 从 stp3 开始，每个 batch 递增（stp3、stp4、stp5...）
- 提交范围包含本 batch 实际修改的代码文件 + `openspec/changes/<name>/tasks.md`
- 提交范围不包含 `.runs/`

### 9. 测试与验收闸门

实现完成后，执行测试并将结果写入 `${RUN_DIR}/tests/summary.result.json`（`kind: test_report`）。

必须输出：

- 改动涉及的模块、目录、关键入口
- 已执行或建议执行的测试命令
- 重点验收场景

执行测试时遵循：

- 自动化测试通过：`status: pass`，继续
- 没有自动化测试：记录验收要点和未覆盖风险后，`status: pass`（注明 `coverage_notes`），继续
- 测试失败：优先尝试修复，最多重试 2 次；若仍失败，`status: failed`，记录失败原因并继续到归档总结

门禁：`tests/summary.result.json` 的 `status == failed` 且 `blocking == true` 时阻断归档。

### 10. 归档

满足测试闸门后，执行：

```bash
openspec archive change "<name>"
```

归档前必须再次确认：

- OpenSpec artifact 与真实实现一致
- `tasks.md` 状态已更新
- 测试状态已记录

#### 归档提交

推荐命令：

```bash
git add openspec/changes/<name>/ openspec/specs/
git commit -m 'docs(openspec): <name> stp<N>: 归档 <change 中文简述>

change-id: <name>
- <摘要归档内容和实现结果>'
```

规则：

- `stp<N>` 为本 change 最后一个步骤编号，紧接实现阶段最后一个 stp
- 提交范围包含归档产物 + `openspec/specs/` 同步后的 spec 文件（如有）
- 提交范围不包含 `.runs/`

## JSON 缺失/损坏容错

当主 agent 读取子 agent 产出的 JSON 时遇到以下情况：

- `result.json` 文件不存在
- `result.json` 文件内容不是合法 JSON
- `result.json` 缺少必需字段（`schema_version`、`status`、`blocking`）

处理策略：

1. **不回退到长文本协议** — 不解析子 agent 的 stdout 自然语言内容作为替代
2. **重试一次** — 对该子 agent 的当前任务/审核重新拉起一个子 agent 实例
3. **第二次仍失败** → 记为 `status: failed, blocking: true`，按严格门禁处理
4. 在阶段汇报中标注"JSON 产出异常"和受影响的 task/artifact

## 输出模板

### 阶段汇报

主 agent 的用户可见汇报改为"阶段摘要 + JSON 结果总览 + 待决策问题清单"，不贴子 agent 原始长输出。

```text
Using change: <name>
Run: <run-id>
当前阶段：artifact 生成 / 未审核提交 / 审核 / 审核后提交 / 实现 / 测试 / 归档
进度：<简短状态>

## JSON 结果总览
| 对象 | 状态 | 阻塞 | 摘要 |
|------|------|------|------|
| proposal | pass | false | 结构完整，与目标一致 |
| specs | needs_revision | true | 缺少场景 X 的验收标准 |

## 待决策问题（本轮共 N 个）
1. [blocking] <question> — 推荐: <recommended_option>
2. [preference] <question> — 默认: <default_if_no_answer>
```

### 归档总结

```text
## Archive Complete

Change: <name>
Run: <run-id>
Artifacts: 审核通过（第 N 轮）/ 2 轮上限后继续
文档快照: stp1 已提交 / stp2 已提交 / 未提交（附原因）
Implementation: 已完成（stp3-stpN）/ 部分完成
Tests: 已通过 / 部分通过 / 无自动化测试
JSON 产出异常: 无 / <受影响对象>
遗留问题: 无 / <清单>
```

更详细的审核 JSON 聚合规则和任务执行计划模板见 `references/`。

## 不中断原则

- 这是一个核心全自动闭环 skill，默认不中断，不等待中间确认。
- 遇到文档问题、审核问题、测试失败或局部实现阻塞时，应记录问题、做自主决策、继续推进剩余链路。
- 子 agent 产出 `question.json` 时，只在同步点批量汇总后统一向用户发问，不逐个中断。
- 只有在 OpenSpec CLI 完全不可执行或宿主环境无法完成最基本文件操作时，才允许以"环境不可执行"结束本次运行；这不是流程性暂停，而是硬性失败。

## 提交信息规范

本 skill 所有 git commit 必须遵循统一格式：

```text
<type>(openspec|<scope>): <change-name> stp<N>: <阶段中文简述>

change-id: <change-name>
- <bullet 1>
- <bullet 2>
```

## Guardrails

- 始终先读依赖 artifact，再生成后续 artifact
- 审核与修订分离，不要边审边改
- 文档审核轮数上限 2 轮，禁止无限循环
- 实现阶段每 task 主 agent 审查上限 2 轮，与文档审核同构
- 进入 apply 前应保留文档快照
- 子 agent 审核实例只读，不得修改任何文件
- 子 agent 实现实例之间文件写入范围不得重叠
- 并发实例 `wait` 收齐后再做下一步决策
- 子 agent 选择优先级：codex 优先，任务总数 >= 10 时启用 claude 分流
- codex 与 claude 实例可在同一 batch 内混用，但审核场景仅用 codex
- 主 agent 只通过 `result.json` 做门禁判定，不解析子 agent stdout 自然语言
- 子 agent 不直接向用户发问，所有问题经 `question.json` 由主 agent 汇总中转
- JSON 缺失/损坏时重试 1 次，第二次失败记为 `failed`，不回退到长文本协议
- `.runs/` 目录不进入 git 提交
