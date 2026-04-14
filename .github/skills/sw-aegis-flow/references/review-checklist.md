# 审核清单

这个文件提供 Sw Aegis Flow v5.2 中的详细审核规则、JSON 输出协议和结果聚合规则。`SKILL.md` 只保留主流程，这里负责承载可复用的细节。

## 审核目标

每轮审核至少检查以下维度：

- 与 change 目标是否一致
- proposal、specs、design、tasks 是否前后一致
- 能力命名是否稳定
- 场景与验收标准是否完整
- design 是否能支撑 tasks
- tasks 是否可执行、可验证
- 文档是否存在明显矛盾、遗漏或越界内容

## 审核执行规则

- 审核阶段只提出问题，不直接修改文档
- 不要边收到意见边改
- 必须等同一轮意见收齐后统一修订
- 修订时要联动检查四类 artifact，而不是只改单份文件
- 审核总轮数上限 2 轮
- 第 2 轮结束后，即使仍有遗留问题，也要记录问题并继续推进

## Codex CLI 并发审核策略

- 默认每个 artifact 启动一个独立 codex 实例审核
- 生成 proposal/specs/design/tasks 后立刻后台启动 codex 审核实例，可与后续 artifact 生成并行
- 所有 codex 审核实例完成后（`wait`），主 agent 只读取 `result.json`，不解析 stdout
- 只有 Codex CLI 不可用时，才降级为主 agent 内串行审核

## Codex CLI 审核调用模板

### 单个 artifact 审核

```bash
codex --approval-mode full-auto -q "请只读审核 openspec/changes/<name>/<artifact>.md，\
不要直接修改文件。检查它是否与 change 目标、前序 artifact 和当前 workflow 规则一致。\
将审核结果写入 <run-dir>/reviews/round-<n>/<artifact>.result.json，\
格式遵循 schema_version 5.2 的 artifact_review 协议，payload 包含 severe_issues/general_issues/suggestions。\
status 取值：pass（无阻塞问题）、needs_revision（有需修订问题）、blocked（无法完成审核）。\
stdout 只打印 RESULT_JSON=<绝对路径>。\
如果遇到需要用户决策的阻塞问题，额外写入 <run-dir>/questions/review--<artifact>.question.json，\
并在 stdout 追加 QUESTION_JSON=<绝对路径>。" &
```

### 最终复审

```bash
codex --approval-mode full-auto -q "请只读复审 openspec/changes/<name>/ 下的 \
proposal、specs、design、tasks 最终版本，不要修改文件。\
重点检查四者是否一致，是否还存在阻塞实现或验收的问题。\
将复审结果写入 <run-dir>/final-review/round-<n>.result.json，\
格式遵循 schema_version 5.2 的 final_review 协议。\
stdout 只打印 RESULT_JSON=<绝对路径>。"
```

## result.json 聚合规则

主 agent 在 `wait` 收齐所有审核实例后，按以下规则聚合判定：

### 单轮聚合

1. 读取 `reviews/round-<n>/` 下所有 `*.result.json`
2. 如有 `final-review/round-<n>.result.json`，也纳入聚合
3. 判定逻辑：
   - 任一 `blocking == true` 或 `status in {needs_revision, blocked, failed}` → **本轮不通过**，进入统一修订
   - 全部 `status == pass` 且 `blocking == false` → **本轮通过**
4. 提取所有 `severe_issues`、`general_issues`、`suggestions` 合并为修订清单

### 跨轮判定

- 第 1 轮不通过 → 统一修订 → 拉起第 2 轮审核（`round-2`）
- 第 2 轮不通过 → 记录遗留问题，标注"审核 2 轮上限已到"，继续推进到 stp2 提交
- 第 2 轮通过 → 正常流转

### 聚合输出模板

主 agent 向用户展示审核结果时使用以下格式（非子 agent 产出）：

```text
## 审核结果聚合（第 N 轮 / 上限 2 轮）

| Artifact | 状态 | 阻塞 | 严重问题 | 一般问题 | 建议 |
|----------|------|------|----------|----------|------|
| proposal | pass | false | 0 | 0 | 1 |
| specs | needs_revision | true | 2 | 1 | 0 |
| design | pass | false | 0 | 1 | 2 |
| tasks | pass | false | 0 | 0 | 0 |

本轮结论：需修订进入下一轮 / 通过 / 2 轮上限已到带遗留继续
```

## question.json 与审核的关系

审核阶段产出 `question.json` 的典型场景：

- 子 agent 审核发现的问题涉及业务决策（如"规格 X 的验收标准需要用户确认是否包含边界情况 Y"）
- 子 agent 无法判断某个设计选择是有意为之还是遗漏

规则：

- 审核子 agent 将问题写入 `questions/review--<artifact>.question.json`
- 在 `result.json` 的 `question_refs` 中引用该文件的相对路径
- 主 agent 在聚合审核结果时，同时读取所有 `question.json`
- 将审核问题和 `question.json` 中的决策问题合并成一轮提问，统一向用户发问
- `severity: blocking` 的问题在用户回答前阻塞对应 artifact 的修订
- `severity: preference` 的问题有 `default_if_no_answer`，可自动采用默认值继续

## 修订后检查点

统一修订完成后，至少复核：

- proposal 中的目标、范围、不做什么是否仍准确
- specs 中的能力、场景、验收标准是否与 proposal 一致
- design 中的关键方案是否覆盖 specs
- tasks 是否完整映射 design 和 specs
- 是否新增了未在 proposal/specs/design 体现的实现内容
