# 批次规划与并发规则

这个文件提供 Sw Aegis Flow v5.2 apply 阶段的详细依赖分析、batch 划分、并发判定和 JSON 驱动执行模板。`SKILL.md` 只保留主流程，这里负责承载实现细则。

## 目标

在修改代码前，先把 `tasks.md` 中的任务按依赖关系拆成安全可执行的批次，再进入实现。这样能减少冲突、提升可追踪性，并通过 Codex CLI 多实例并发显著提高效率。

## 默认策略

- **默认使用 Codex CLI 多实例并发执行**：对互不依赖的任务，同一 batch 内每个任务启动一个 codex 实例并发实现，以显著缩短整体周期。
- **只有 Codex CLI 不可用时才降级**：若无法启动 codex 进程，再改为主 agent 内串行执行。
- **并发前先做保守判定**：只要无法确认是否独立，就按串行处理。
- **批次之间必须串行**：后续 batch 依赖前序 batch 的产出，不要跨 batch 并发。

## 依赖分析方法

1. 逐条识别每个任务涉及的文件、模块、接口、类型、配置或脚本
2. 判断任务之间是否存在前置依赖
3. 判断是否存在文件级写冲突
4. 对不确定是否独立的任务，按保守策略视为串行
5. 形成批次计划并输出给用户

## 适合并发的任务

- 修改完全不同目录或文件的独立功能
- 彼此不依赖新增接口、类型、配置项的任务
- 单元测试补充与某个独立模块代码实现一一对应的任务

## 不适合并发的任务

- 会修改同一文件的任务
- 共享同一公共接口、类型定义或状态模型的任务
- 一个任务依赖另一个任务先创建模块、接口或配置的任务
- 无法确认冲突边界的任务

## 任务执行计划模板

```text
## 任务执行计划

Run: <run-id>
依赖分析摘要：共 N 个任务，划分为 M 个批次

Batch 1（可并发）: Task 1, Task 3, Task 5
- 无前置依赖
- result.json 输出: tasks/batch-1/{task-1,task-3,task-5}.result.json

Batch 2（可并发）: Task 2, Task 4
- 前置：Batch 1（需 integration/batch-1.result.json status == pass）
- result.json 输出: tasks/batch-2/{task-2,task-4}.result.json

Batch 3（串行）: Task 6
- 前置：Batch 2
- result.json 输出: tasks/batch-3/task-6.result.json
```

## Codex/Claude CLI 实现调用模板

所有调用 prompt 必须包含 JSON 输出路径指令和 stdout 约束。

```bash
# Batch 内并发实现（codex）
codex --approval-mode full-auto -q "请实现 OpenSpec 任务 <task-id>，\
严格遵循 openspec/changes/<name>/ 下的 proposal、specs、design、tasks。\
完成后将 tasks.md 对应项标记为 [x]。\
只修改以下文件范围：<file-list>。\
如果遇到阻塞，请报告原因，并继续完成其他不受阻的任务。\
将执行结果写入 <run-dir>/tasks/batch-<n>/<task-id>.result.json，\
格式遵循 schema_version 5.2 的 task_execution 协议，\
payload 包含 completed_tasks/changed_files/tests_run/risks/followups。\
stdout 只打印 RESULT_JSON=<绝对路径>。\
如果遇到需要用户决策的阻塞问题，额外写入 <run-dir>/questions/apply--<task-id>.question.json，\
并在 stdout 追加 QUESTION_JSON=<绝对路径>。" &

# Batch 内并发实现（claude，任务总数 >= 10 时启用）
claude -p "请实现 OpenSpec 任务 <task-id>，\
严格遵循 openspec/changes/<name>/ 下的 proposal、specs、design、tasks。\
完成后将 tasks.md 对应项标记为 [x]。\
只修改以下文件范围：<file-list>。\
将执行结果写入 <run-dir>/tasks/batch-<n>/<task-id>.result.json，\
格式遵循 schema_version 5.2 的 task_execution 协议。\
stdout 只打印 RESULT_JSON=<绝对路径>。\
如果遇到需要用户决策的阻塞问题，额外写入 <run-dir>/questions/apply--<task-id>.question.json，\
并在 stdout 追加 QUESTION_JSON=<绝对路径>。" \
--allowedTools "Read,Edit,Bash" &

# 等待全部实例完成
wait
```

## result.json 消费流程

`wait` 完成后，主 agent 按以下流程消费 result.json：

1. **逐个读取** `<run-dir>/tasks/batch-<n>/<task-id>.result.json`
2. **检查 status**：
   - `pass` → 该 task 进入主 agent 审查
   - `blocked` → 检查 `question_refs`，只暂停该 task，不冻结其他 task
   - `failed` → 记录失败，不阻塞其他 task
3. **收集所有 question_refs** → 读取关联的 `question.json` 文件
4. **在批次同步点** → 将所有 `question.json` 合并成一轮提问，统一向用户发问
5. **用户回答后** → 对受阻 task 重新拉起子 agent 或主 agent 手动修复

## 集成复核 JSON gate

```bash
# 集成复核
codex --approval-mode full-auto -q "请检查以下文件的接口一致性和回归风险：<file-list>。\
只读审核，不修改文件。\
将复核结果写入 <run-dir>/integration/batch-<n>.result.json，\
格式遵循 schema_version 5.2 的 integration_review 协议，\
payload 包含 checked_files/compat_risks/required_fixes。\
stdout 只打印 RESULT_JSON=<绝对路径>。"
```

集成复核门禁：

- 读取 `integration/batch-<n>.result.json`
- `status == pass` 且 `blocking == false` → 通过，进入下一 batch
- `status in {failed, blocked}` 或 `blocking == true` → 阻断后续 batch 和归档
- `required_fixes` 非空时，主 agent 先执行修复再继续

## question.json 在实现阶段的使用

实现阶段产出 `question.json` 的典型场景：

- 子 agent 发现 specs 与现有代码存在冲突，需要用户确认以哪个为准
- 子 agent 遇到未在 design 中覆盖的边界情况，需要决策
- 子 agent 发现多种可行实现方式，各有权衡，需要用户选择

规则：

- `severity: blocking` 的问题只暂停 `blocks` 中列出的 task，不冻结同批次其他独立 task
- `severity: preference` 的问题有 `default_if_no_answer`，在用户未回答时自动采用默认选项
- 主 agent 在当前 batch 的 `wait` 同步点批量汇总所有 `question.json`
- 如果 batch 内所有 task 都被 blocking question 阻塞，在向用户发问后暂停当前 batch
- 如果 batch 内有部分 task 不受阻塞，先推进不受阻的 task 的主 agent 审查和集成复核

## 批次执行规则

- 完成一个 batch 后，再进入下一个 batch
- 同一 batch 全部完成后，先用 codex 实例做集成复核，再推进
- 如果并发结果出现冲突，由主执行者统一合并
- 如果实现偏离文档，先更新 OpenSpec 文档，再继续实现
- 每个 codex/claude 实例必须明确写入负责文件范围，不得越界修改其他实例的文件
- 所有门禁判定通过 `result.json` 结构化数据，不依赖子 agent stdout 的自然语言内容

## 最低要求

即使 Codex CLI 不可用，也必须：

- 做依赖分析
- 输出 batch 计划
- 按 batch 顺序实现
- 回写 `tasks.md`
- 主 agent 实现时同样产出 `result.json`（`agent.engine: main`）
