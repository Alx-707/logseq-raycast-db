# 研究发现

## kerim/raycast-logseq-search 分析

### 技术栈
- TypeScript + React
- Raycast API (@raycast/api ^1.98.2)
- 无第三方依赖

### 核心组件
- `search-logseq.tsx`: 单文件实现，包含搜索功能
- Graph 选择: 使用 `LocalStorage` 持久化
- 服务器通信: 直接 fetch 调用

### API 端点使用
| 端点 | 用途 |
|------|------|
| `GET /list` | 获取所有 Graph 列表 |
| `GET /search?q=xxx&graph=xxx` | 搜索页面 |

### 数据结构
```typescript
interface LogseqPage {
  "block/uuid": string;
  "block/title": string;
  "block/name": string;
  "db/id": number;
  "block/journal-day"?: number;
}
```

---

## kerim/logseq-http-server 分析

### 技术栈
- Python 3 (标准库，无 pip 依赖)
- HTTP Server: `http.server` 模块
- 调用 @logseq/cli 命令

### 现有端点
| 端点 | 方法 | 功能 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/list` | GET | 列出所有 Graph |
| `/show` | GET | 显示 Graph 信息 |
| `/search` | GET | 全文搜索 |
| `/query` | POST | 执行 Datalog 查询 |

### CLI 命令映射
- `/list` → `logseq list`
- `/search?q=xxx` → `logseq search "xxx" -g <graph>`
- `/query` → `logseq query "<datalog>" -g <graph>`

### 需要添加的端点
- `/append` → `logseq append "<content>" -g <graph>`
- `/today` → 获取今日日记页面名

---

## @logseq/cli 命令参考

### 已验证命令
```bash
# 列出 graphs
logseq list

# 搜索
logseq search "keyword" -g my-graph

# 追加内容（需验证）
logseq append "content" -g my-graph

# 查询
logseq query '[:find ...]' -g my-graph
```

### append 命令格式 ⚠️ 重要更新
根据 @logseq/cli NPM 文档确认：
- `append` 命令**仅支持 in-app graph**（需要 Logseq 桌面版运行且开启 HTTP API Server）
- 命令格式：`logseq append <text> -a <api-token>`
- 认证方式：`-a <token>` 或环境变量 `$LOGSEQ_API_SERVER_TOKEN`
- 追加到：当前打开的页面（current page）

```bash
# 追加到当前页面
logseq append "My note" -a my-token

# 使用环境变量
export LOGSEQ_API_SERVER_TOKEN=my-token
logseq append "My note"
```

---

## Raycast Extension 开发要点

### 命令类型
- `view`: 显示列表/表单界面
- `no-view`: 直接执行操作（适合快捷记录）

### 偏好设置 (package.json)
```json
{
  "preferences": [
    { "name": "serverUrl", "type": "textfield", "default": "http://localhost:8765" },
    { "name": "defaultCapturePage", "type": "textfield", "default": "Inbox" },
    { "name": "addTimestamp", "type": "checkbox", "default": false }
  ]
}
```

### Form 组件
```typescript
import { Form, Action, ActionPanel } from "@raycast/api";

// 用于 Quick Capture 输入
<Form>
  <Form.TextArea id="content" title="Content" />
  <Form.Dropdown id="targetPage">...</Form.Dropdown>
</Form>
```
