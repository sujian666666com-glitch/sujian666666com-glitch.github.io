## ADDED Requirements

### Requirement: 暖色手账式人生冒险地图

LifeMap SHALL 使用暖色手账式人生冒险地图视觉，替代深色科技知识图谱视觉。

#### Scenario: 用户解锁后查看地图

- **WHEN** 用户输入正确密码并加载 LifeMap
- **THEN** 页面第一眼应呈现米白、奶油、羊皮纸色的纸感地图
- **AND** 节点应像手绘地图元素或人物贴纸
- **AND** 不应出现深蓝网格、霓虹线、玻璃拟态或后台面板感

#### Scenario: 导出地图主体

- **WHEN** 用户点击导出 PNG
- **THEN** 导出的图片只包含暖色手绘地图主体
- **AND** 不包含右侧详情面板或其它非地图主体控件

### Requirement: 双模式地图

LifeMap SHALL 支持“人物关系”和“闯关路线”两个模式，并默认进入“人物关系”模式。

#### Scenario: 默认人物关系地图

- **WHEN** 用户解锁 LifeMap
- **THEN** 默认选中“人物关系”
- **AND** 地图应以“我”为中心展示主要人物关系

#### Scenario: 切换到闯关路线地图

- **WHEN** 用户点击“闯关路线”书签
- **THEN** 地图应切换为从左下到右上的主线闯关路径
- **AND** 主线应包含小镇起点、初中迷失、初三醒悟、青春支线、大学拖延 Boss、游乐场觉醒、AI 转职、深圳实习、终极目标

### Requirement: 称谓化人物节点

LifeMap SHALL 增加 `person` 节点类型，并使用称谓化人物表达。

#### Scenario: 人物关系地图展示人物

- **WHEN** 用户查看人物关系地图
- **THEN** 地图应展示我、奶奶、爸爸、姑姑、弟弟、表姐、表弟、她、宿舍朋友、现实提醒者、OpenCV 老师 / 培训老师、未来的我
- **AND** 不应展示真实姓名

#### Scenario: 点击普通人物

- **WHEN** 用户点击任一人物节点
- **THEN** 系统应高亮 TA 影响过的关卡、Boss、觉醒点和目标
- **AND** 其它节点和关系线应降低透明度
- **AND** 详情面板应展示 TA 是谁、与我的关系、影响了哪些关卡、留下的情绪

### Requirement: 青春支线作为重要剧情线

LifeMap SHALL 将“她”作为重要青春支线呈现，而不是普通人物节点或普通感情标签。

#### Scenario: 人物关系地图中展示她

- **WHEN** 用户查看人物关系地图
- **THEN** “她”应作为高权重人物节点呈现
- **AND** 视觉权重应仅次于奶奶和“我”

#### Scenario: 闯关路线地图中展示青春支线

- **WHEN** 用户查看闯关路线地图
- **THEN** 青春支线应从高中阶段分叉出来
- **AND** 使用紫棕色 / 暖粉棕色虚线
- **AND** 延伸到大学异地分手和长期遗憾节点
- **AND** 这条支线应明显、完整、有连续路径感

#### Scenario: 点击她

- **WHEN** 用户点击“她”节点
- **THEN** 系统应高亮“她”节点
- **AND** 高亮完整青春支线
- **AND** 高亮高中、大学、长期遗憾等相关人生阶段
- **AND** 主线应保留但降低透明度

#### Scenario: 点击青春支线节点

- **WHEN** 用户点击青春支线中的任一节点
- **THEN** 详情面板应展示发生了什么、当时的情绪、对我的影响、为什么成为遗憾
- **AND** 详情面板应说明它与出人头地、自我证明、另一条人生线的关系

### Requirement: LifeMap v2 数据接口扩展

LifeMap SHALL 扩展服务端数据结构以支持模式、视觉、人物关系、青春支线和详情面板，但 SHALL NOT 改变现有安全边界。

#### Scenario: 数据结构支持人物和支线

- **WHEN** 服务端返回 LifeMap 数据
- **THEN** 节点类型应支持 `person`
- **AND** 节点可包含 `modeRole`、`visualKind`、`chapter`、`relatedPeopleIds`、`storyBeats`、`defeatBy`、`branchId`、`branchLabel`、`branchWeight`
- **AND** 边可包含 `relationLabel`、`lineStyle`、`strength`、`visibleInModes`

#### Scenario: 青春支线数据满足约定

- **WHEN** 服务端返回青春支线节点和边
- **THEN** 相关节点应使用 `branchId: "youth-love"`
- **AND** 支线标签应为 `branchLabel: "青春支线"`
- **AND** 支线权重应为 `branchWeight: "important"`
- **AND** 相关人物应包含 `relatedPeopleIds: ["her"]`
- **AND** 相关边应使用 `lineStyle: "youth-branch"`
- **AND** 相关边应可见于 `visibleInModes: ["relationship", "route"]`

#### Scenario: 未授权访问仍被拒绝

- **WHEN** 用户没有有效 access token 请求 `/api/life-map/data`
- **THEN** 服务端应返回未授权响应
- **AND** 不应返回真实 LifeMap 节点数据

#### Scenario: 静态 bundle 不泄露真实数据

- **WHEN** 执行生产构建后检查 `.next/static`
- **THEN** 真实履历内容不应出现在客户端静态 bundle 中

### Requirement: 手账式筛选、章节和详情面板

LifeMap SHALL 将交互控件改为手账书签与纸质标签，并按节点类型展示差异化详情。

#### Scenario: 筛选标签

- **WHEN** 用户查看筛选区域
- **THEN** 筛选项应为全部、家庭、青春、学习、工作、Boss、觉醒、目标
- **AND** 控件视觉应像纸质标签

#### Scenario: 章节书签

- **WHEN** 用户查看时间轴
- **THEN** 时间轴应呈现童年、小学、初中、高中、大学、实习、未来章节书签

#### Scenario: Boss 详情

- **WHEN** 用户点击 Boss 节点
- **THEN** 详情面板应展示弱点、代价、击败方式、当前状态

#### Scenario: 觉醒点详情

- **WHEN** 用户点击觉醒点
- **THEN** 详情面板应展示前因、触发、后果
