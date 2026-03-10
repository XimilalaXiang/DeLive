# DeLive AI Prioritized To-Do List

> 生成日期: 2026-03-10
> 当前判断: DeLive 下一阶段不应继续把重心放在“更多转录入口”，而应优先把产品升级为 `local-first 音频智能工作台`
> 本版原则: `AI 优先`、`会后价值优先`、`先把已有 transcript 变成可复用知识`
> 明确延后: 文件转录、批量转录、Watch Folder、热词替换，不作为当前第一波重点

## 这份文档怎么写

这份 TODO 文档应包含 6 类信息：

1. 产品判断
- 当前产品已经具备稳定的采集、转录、持久化、字幕、历史能力
- 下一阶段最缺的不是“再多一条转录链路”，而是“理解、整理、检索、复用”

2. 排序原则
- 先做能显著提升产品价值感知的能力
- 先做复用现有 transcript / session schema 的能力
- 先做单会话闭环，再做跨会话，再做更重的入口扩张

3. 优先级分层
- `P0`: 必须立即推进，决定产品方向
- `P1`: 高优先级，P0 落地后立刻接
- `P2`: 重要，但不应打断当前主线
- `P3`: 可以保留，但明确后置

4. 每个事项的固定字段
- 做什么
- 为什么现在做
- 依赖什么
- 完成标准

5. 明确暂缓项
- 写清楚哪些不做，不然执行时容易重新发散

6. 推荐执行顺序
- 把真实的落地顺序写出来，而不是只列功能名

## 当前排序原则

### 优先级判断标准

按下面顺序排序：

1. 是否直接提升用户感知价值
2. 是否能复用现有 transcript / session / postProcess 数据结构
3. 是否能形成完整闭环
4. 是否会把 DeLive 从“字幕工具”推向“AI 工作台”
5. 是否需要大规模新增底层能力

### 当前不优先做的方向

- 文件转录
- 批量转录队列
- Watch Folder
- 热词替换 / glossary
- Mixed Capture

原因：

- 这些更像入口扩张或识别增强，不是当前最关键的产品跃迁点
- 当前更缺的是“转录之后能做什么”

## P0 必须立即推进

### 1. AI Post-Process 任务流

- [ ] 建立统一的 AI 后处理任务入口
- [ ] 支持对单个 session 触发 AI 分析
- [ ] 支持写回 `postProcess`
- [ ] 支持重新生成与覆盖策略

为什么现在做：

- 这是当前最短路径把 transcript 变成结构化价值的能力
- 现有 schema 已经有 `summary / actionItems / keywords / chapters`
- 不先做任务流，后面的 summary / QA / project intelligence 都会继续散落

依赖：

- 现有 `postProcess` 持久化链路
- 一个独立于 ASR provider 的 AI provider / workload 抽象

完成标准：

- 单个 session 可以触发一次 AI 后处理
- 结果稳定写入 `postProcess`
- 可以区分 `pending / success / error`

### 2. Session Briefing UI

- [ ] 在预览弹窗中展示 `summary`
- [ ] 展示 `action items`
- [ ] 展示 `chapters`
- [ ] 展示 `keywords`
- [ ] 支持手动刷新 / 重跑

为什么现在做：

- 没有展示层，AI 结果再好也只是“写进库里”
- 这是最容易被用户感知到的 AI 升级

依赖：

- `AI Post-Process 任务流`

完成标准：

- 用户在历史详情里可以直接看到 AI 结果
- AI 结果和 transcript、translation、speaker 信息并列存在

### 3. 自动标题与自动标签建议

- [ ] AI 自动生成 session title
- [ ] AI 推荐标签
- [ ] 支持一键接受或手动改写

为什么现在做：

- 成本低，收益高
- 会直接提升历史面板的整理效率
- 这是从“原始记录堆积”转向“可组织资料库”的第一步

依赖：

- `AI Post-Process 任务流`

完成标准：

- 新 session 完成后可生成推荐标题
- 推荐标签可以直接写入现有 tag 体系

## P1 高优先级，第二阶段推进

### 4. Ask This Session

- [ ] 支持对单个 session 提问
- [ ] 支持回答时引用 transcript 片段
- [ ] 支持问题历史

为什么现在做：

- 这是最直接的“AI assistant”体验
- 比普通搜索更符合用户预期

依赖：

- 稳定的 session detail 数据展示
- transcript 分段或引用策略

完成标准：

- 用户可在单个 session 内进行问答
- 回答基于当前 session 内容，不做跨会话混淆

### 5. Advanced History Search

- [ ] 搜索 `translatedTranscript`
- [ ] 搜索 `summary / keywords / chapters`
- [ ] 搜索 `speaker / provider / tags`
- [ ] 支持按 AI 结果过滤

为什么现在做：

- 当前搜索只覆盖标题和 transcript，价值太浅
- AI 结果出来后，不升级搜索就无法放大其价值

依赖：

- `Session Briefing UI`
- `AI Post-Process 任务流`

完成标准：

- 用户可通过结构化字段找到历史内容
- AI 结果成为搜索入口，而不是孤立展示块

### 6. Speaker Intelligence

- [ ] 按 speaker 生成发言摘要
- [ ] 抽取 speaker 维度 action items
- [ ] 统计发言占比或发言轮次

为什么现在做：

- DeLive 已经有 Soniox speaker metadata 基础
- 这会让多发言人场景明显区别于普通转录工具

依赖：

- 现有 speaker / segment 持久化
- `AI Post-Process 任务流`

完成标准：

- 对存在说话人数据的 session，能显示 speaker intelligence 卡片

## P2 重要，但不要打断主线

### 7. Live Copilot

- [ ] 录制中低频刷新滚动摘要
- [ ] 提示 topic shift
- [ ] 提示关键待确认点

为什么放在 P2：

- 产品价值很高
- 但交互与时机控制复杂，容易干扰当前录制体验

完成标准：

- 录制过程中可以看到低打扰的 AI 侧栏

### 8. Multi-Session Ask / Project Memory

- [ ] 支持对多个 session 联合提问
- [ ] 支持按项目或主题组织多个 session
- [ ] 支持生成项目级摘要

为什么放在 P2：

- 这是 DeLive 从工具到知识库的关键一步
- 但需要先把单会话 AI 体验做扎实

完成标准：

- 用户可跨多个 session 查询结论、上下文与共性主题

### 9. AI Provider Layer

- [ ] 为 post-process 抽象单独 provider 层
- [ ] 支持云端与本地模型两条路径
- [ ] 支持任务能力声明：`summary / qa / chaptering / tagging`

为什么放在 P2：

- 架构上非常重要
- 但可以先用单实现验证交互和数据流，再抽象成通用层

完成标准：

- AI 能力不再硬塞进 ASR provider 体系

## P3 明确保留，但后置

### 10. 文件转录

- [ ] 单文件导入
- [ ] 文件来源写入 `sourceMeta`
- [ ] 结果入库

为什么后置：

- 这是入口扩张，不是当前价值核心

### 11. 批量转录队列 / Watch Folder

- [ ] 批量任务
- [ ] 自动监听目录
- [ ] 失败重试

为什么后置：

- 更偏生产力流水线，不是当前最关键的产品分化点

### 12. 热词替换 / glossary / keyterms

- [ ] provider 级术语提示
- [ ] 后处理替换规则
- [ ] 自定义词表

为什么后置：

- 这是识别质量增强项
- 但现在更重要的是“识别之后的 AI 价值层”

### 13. Mixed Capture

- [ ] `system-audio + microphone`
- [ ] UI 选择与降级策略
- [ ] `sourceMeta.captureMode = mixed`

为什么后置：

- 工程量不低
- 对当前 AI 主线帮助有限

## 推荐执行顺序

1. AI Post-Process 任务流
2. Session Briefing UI
3. 自动标题与自动标签建议
4. Ask This Session
5. Advanced History Search
6. Speaker Intelligence
7. Live Copilot
8. Multi-Session Ask / Project Memory
9. AI Provider Layer 抽象收口
10. 文件转录 / 批量队列 / Watch Folder
11. 热词替换 / glossary / keyterms
12. Mixed Capture

## 一句话执行原则

> 先把已有 transcript 变成可总结、可提问、可检索、可组织的知识，再去扩充更多转录入口。
