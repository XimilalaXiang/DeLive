# 数据与持久化

## 会话数据模型

核心数据类型为 `TranscriptSession`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 唯一标识符 |
| `schemaVersion` | `number` | 当前为 3 |
| `title` | `string` | 显示标题 |
| `date` / `time` | `string` | `YYYY-MM-DD` / `HH:mm` |
| `transcript` | `string` | 纯文本转录 |
| `translatedTranscript` | `TranscriptTranslationData` | 可选翻译文本 |
| `duration` | `number` | 持续时间（毫秒） |
| `tokens` | `TranscriptTokenData[]` | 带时间戳的 Token |
| `speakers` | `TranscriptSpeaker[]` | 说话人标签 |
| `segments` | `TranscriptSegment[]` | 带时间戳的分段 |
| `postProcess` | `TranscriptPostProcess` | AI 简报输出 |
| `askHistory` | `TranscriptAskTurn[]` | 问答对话轮次 |
| `mindMap` | `TranscriptMindMap` | 思维导图数据 |
| `topicId` | `string` | 关联主题 |
| `tagIds` | `string[]` | 关联标签 |
| `providerId` | `string` | 使用的 ASR Provider |
| `status` | `TranscriptSessionStatus` | `recording`、`interrupted`、`completed` |

## 存储架构

```
┌─────────────────────────────────────────┐
│  sessionStore (Zustand)                  │
│  运行时状态 + sessions 数组               │
│  ↕ 读/写                                 │
├──────────────────────────────────────────┤
│  sessionRepository（内存缓存）            │
│  cachedSessions: TranscriptSession[]     │
│  ↕ 异步持久化                             │
├──────────────────────────────────────────┤
│  sessionStorage (IndexedDB)              │
│  DB: 'delive-app', store: 'sessions'     │
│  索引: 'updatedAt'（排序检索）             │
└──────────────────────────────────────────┘
```

### IndexedDB Schema

数据库 `delive-app` 版本 3，包含四个对象存储：

| 存储 | Key Path | 索引 | 内容 |
|------|----------|------|------|
| `sessions` | `id` | `updatedAt` | 转录会话 |
| `meta` | `key` | — | 迁移标志 |
| `settings` | `id` | — | 设置镜像 |
| `tags` | `id` | — | 标签镜像 |

### localStorage 键

| 键 | 内容 |
|----|------|
| `desktoplive_settings` | 应用设置（权威来源） |
| `desktoplive_tags` | 标签 |
| `desktoplive_topics` | 主题 |
| `language` | 界面语言 |
| `theme` | 明暗模式偏好 |

设置和标签 **镜像** 到 IndexedDB 以实现冗余。启动时如果 localStorage 为空但 IndexedDB 有数据，则从 IDB 恢复。

::: info
主题 **仅** 存储在 localStorage 中，不包含在备份/导出中。
:::

## 会话生命周期

### 创建

`sessionStore.startNewSession()` 通过 `sessionRepository.createDraft()` 创建草稿，状态为 `recording`，空转录和元数据。

### 自动保存

每个转录事件触发 `scheduleCurrentSessionAutosave()`，**1200ms 防抖**。仅在快照有实质内容时才持久化。

### 完成

`sessionStore.endCurrentSession()` 调用 `sessionRepository.completeSession()` 设置 `status: 'completed'`。如果会话无内容，则删除草稿。

### 恢复

`loadSessions()` 时，任何 `status: 'recording'` 的会话被标记为 `interrupted` 和 `wasInterrupted: true`。第一个有内容的中断会话成为 `recoverySession`。用户可以恢复或忽略。

## 备份与导入

- **导出**：`exportAllData()` → 包含会话、标签和设置的 JSON 文件
- **覆盖导入**：替换所有数据（保留现有 API Key）
- **合并导入**：仅按 ID 添加新会话和标签
- **规范化**：导入时验证和修复数据结构
