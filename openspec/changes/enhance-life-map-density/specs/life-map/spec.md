## ADDED Requirements

### Requirement: 地图节点减密度与分形渲染

LifeMap SHALL 按节点类型与 visualKind 使用差异化地图壳，地图上仅展示短标题、章节小标签与视觉符号。

#### Scenario: 默认查看人物关系地图

- **WHEN** 用户解锁并查看人物关系地图
- **THEN** 人物节点应呈现贴纸/圆形便签形态
- **AND** 关卡节点应按 visualKind 呈现木牌、小屋、篝火、宝箱、旗帜、城堡等差异形态
- **AND** 地图节点不应展示 period、status 或长 subtitle

#### Scenario: 青春支线默认 ghost

- **WHEN** 用户未选中「她」或未聚焦青春支线
- **THEN** 青春支线 side_quest 节点应以 ghost 态（图标 + 短 mapLabel）呈现
- **AND** 主要人物与主线节点保持 full/hero 可见

### Requirement: 手账式详情面板

LifeMap 详情面板 SHALL 使用段落、便签块、情绪标签与故事小路，而非 label/value 表格栈。

#### Scenario: 查看人物详情

- **WHEN** 用户选中人物节点
- **THEN** 详情面板应展示「TA 是谁」自然段
- **AND** 影响关卡以小纸片列表展示且可点击跳转
- **AND** 情绪以标签 chip 展示

#### Scenario: 查看青春支线详情

- **WHEN** 用户选中青春支线节点
- **THEN** 详情面板应以纵向故事小路展示 storyBeats
- **AND** 不应呈现多行同构字段表

### Requirement: 点击她聚焦青春小路

LifeMap SHALL 在用户点击「她」时将完整青春支线提升为主视觉焦点。

#### Scenario: 点击她

- **WHEN** 用户点击「她」节点
- **THEN** 全部 youth-love 链节点应从 ghost 升为 full/hero
- **AND** 其它节点应降低透明度
- **AND** 地图应 fitView 框选青春支线区域
- **AND** 青春支线边线应使用紫棕色虚线并可在聚焦时 animated
