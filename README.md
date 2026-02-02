# Logseq Raycast Extension

> 🚀 在 Raycast 中搜索和快速记录到 Logseq

## 这是什么？

一个 [Raycast](https://raycast.com/) 扩展，让你无需打开 Logseq 就能：

- **搜索** - 快速搜索 Logseq 中的页面
- **快速记录** - 一键将想法记录到今天的 Journal

### 解决的问题

使用 Logseq 记录想法时，传统流程是：切换到 Logseq → 打开 Journal → 输入内容。

有了这个扩展，你只需：**按快捷键 → 输入 → 回车**，内容自动保存到今天的 Journal。

## 系统要求

| 要求 | 说明 |
|------|------|
| Logseq DB 版本 | 新版 Logseq（非文件版本） |
| @logseq/cli | `npm install -g @logseq/cli` |
| Python 3 | 运行 HTTP Server |
| Raycast | macOS 启动器 |

## 快速开始

### 1. 获取 Logseq API Token

1. 打开 Logseq Desktop
2. 进入 **Settings → Features → HTTP APIs Server**
3. 启用并复制 Token

### 2. 启动 HTTP Server

```bash
# 克隆项目
git clone https://github.com/Alx-707/logseq-raycast-db.git
cd logseq-raycast-db

# 启动服务器
cd http-server
python3 logseq_server.py --api-token YOUR_TOKEN
```

或使用环境变量：

```bash
export LOGSEQ_API_SERVER_TOKEN=your-token
python3 logseq_server.py
```

### 3. 安装 Raycast 扩展

```bash
cd raycast-extension
npm install
npm run dev
```

### 4. 配置扩展

1. 打开 Raycast 偏好设置 (`⌘ + ,`)
2. 找到 **Logseq DB** 扩展
3. 填入：
   - **Server URL**: `http://localhost:8765`（默认）
   - **API Token**: 第 1 步获取的 Token

## 使用方法

### Quick Note（推荐）

最快的记录方式：

1. `⌘ + Space` 打开 Raycast
2. 输入 `Quick Note` 或设置快捷键
3. 输入内容，按 `Enter`
4. ✅ 自动保存到今天的 Journal

### Search Logseq

搜索 Logseq 中的页面：

1. `⌘ + Space` 打开 Raycast
2. 输入 `Search Logseq`
3. 输入关键词搜索
4. 选择结果，按 `Enter` 在 Logseq 中打开

### Quick Capture

带更多选项的记录：

- 添加标签（如 `#todo #work`）
- 设置优先级（A/B/C）

## 常见问题

### "Cannot connect to Logseq HTTP server"

1. 确保 HTTP Server 正在运行
2. 检查端口是否被占用：`lsof -i :8765`

### "Missing API token"

1. 确保 Logseq 已启用 HTTP API Server
2. 检查 Token 是否正确复制到 Raycast 偏好设置

### 内容没有出现在 Logseq

1. 确保 Logseq Desktop 正在运行
2. 检查 Logseq 的 HTTP API Server 是否启用
3. 查看服务器日志：`tail -f http-server/logseq-http-server.log`

更多问题请查看 [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

## 项目结构

```
logseq-raycast-db/
├── http-server/
│   └── logseq_server.py      # Python HTTP 服务器
├── raycast-extension/
│   └── src/
│       ├── capture-to-journal.tsx  # Quick Note 命令
│       ├── quick-capture.tsx       # Quick Capture 命令
│       ├── search-logseq.tsx       # Search 命令
│       └── services/logseq-api.ts  # API 服务
└── docs/
    └── TROUBLESHOOTING.md    # 问题排查指南
```

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/list` | GET | 列出所有 Graph |
| `/search?q=QUERY&graph=NAME` | GET | 搜索页面 |
| `/append-to-journal` | POST | 追加到今天的 Journal |
| `/append` | POST | 追加到当前打开的页面 |

## 致谢

- 原始搜索扩展 by [kerim](https://github.com/kerim/raycast-logseq-search)
- HTTP Server by [kerim](https://github.com/kerim/logseq-http-server)

## License

MIT
