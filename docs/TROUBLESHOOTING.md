# 问题排查与经验总结

本文档记录开发过程中遇到的问题及解决方案，供后续参考。

## 目录

1. [Quick Capture 无法写入内容](#1-quick-capture-无法写入内容)
2. [API Token 未正确传递](#2-api-token-未正确传递)
3. [内容写入到错误页面](#3-内容写入到错误页面)

---

## 1. Quick Capture 无法写入内容

### 问题描述
使用 Raycast Quick Capture 提交内容后，Raycast 显示成功，但 Logseq 中没有任何内容出现。

### 根本原因
`logseq append` CLI 命令只能追加到**当前打开的页面**。如果 Logseq 没有打开任何页面（或最小化），`getCurrentPage()` 返回 `null`，导致写入失败但无明确错误。

### 解决方案
改用 Logseq 原生 HTTP API 的 `appendBlockInPage` 方法，直接指定目标页面：

```python
# 使用 Logseq 原生 API 直接写入 Journal
payload = {
    'method': 'logseq.Editor.appendBlockInPage',
    'args': [today, content]  # today = "2026-02-02"
}
requests.post('http://127.0.0.1:12315/api', json=payload, headers=headers)
```

### 关键点
- Logseq 原生 API 端口：`12315`（非我们的 Python 服务器 `8765`）
- Journal 页面名称格式：`YYYY-MM-DD`（如 `2026-02-02`）

---

## 2. API Token 未正确传递

### 问题描述
服务器返回 401 错误：`Missing API token`，但用户已在 Raycast 偏好设置中配置了 token。

### 根本原因
1. **字段名不匹配**：前端发送 `api_token`，后端期望 `token`
2. **偏好设置缓存**：`LogseqAPIService` 在构造时读取偏好设置，之后用户修改 token 不会生效

### 解决方案

**修复字段名：**
```typescript
// ❌ 错误
const body = { content, api_token: token };

// ✅ 正确
const body = { content, token };
```

**传递最新 token：**
```typescript
// 在调用时显式传递当前偏好设置中的 token
await logseqAPI.appendToJournal(content, preferences.apiToken);
```

### 调试技巧
```bash
# 测试 API 端点
curl -X POST http://localhost:8765/append-to-journal \
  -H "Content-Type: application/json" \
  -d '{"content": "test", "token": "your-token"}'
```

---

## 3. 内容写入到错误页面

### 问题描述
内容被写入到当前打开的页面，而不是 Today's Journal。

### 根本原因
原来使用的 `logseq append` CLI 命令设计就是追加到当前页面。

### 解决方案
新增专用端点 `/append-to-journal`，使用 Logseq 原生 API：

```python
def _append_to_journal(self, content, api_token):
    today = datetime.now().strftime('%Y-%m-%d')
    
    payload = {
        'method': 'logseq.Editor.appendBlockInPage',
        'args': [today, content]
    }
    
    # 调用 Logseq 原生 API
    req = urllib.request.Request(
        'http://127.0.0.1:12315/api',
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_token}'
        }
    )
```

### API 端点对比

| 端点 | 目标位置 | 适用场景 |
|------|----------|----------|
| `/append` | 当前打开的页面 | 需要用户手动选择目标 |
| `/append-to-journal` | 今天的 Journal | 快速记录，无需打开特定页面 |

---

## 常用调试命令

```bash
# 查看服务器日志
tail -f /tmp/logseq-server.log

# 测试 Logseq 原生 API 连接
curl -s http://127.0.0.1:12315/api \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method": "logseq.Editor.getCurrentPage", "args": []}'

# 直接测试写入 Journal
curl -s http://127.0.0.1:12315/api \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method": "logseq.Editor.appendBlockInPage", "args": ["2026-02-02", "测试内容"]}'

# 重启 Python 服务器
pkill -f logseq_server.py
python3 /path/to/logseq_server.py --api-token YOUR_TOKEN &
```

---

## 环境要求

| 组件 | 要求 |
|------|------|
| Logseq | 需运行，启用 HTTP API Server |
| @logseq/cli | `npm install -g @logseq/cli` |
| Python | 3.7+ |
| Raycast | 最新版本 |

## 相关文件

- 服务器代码：`http-server/logseq_server.py`
- API 服务：`raycast-extension/src/services/logseq-api.ts`
- Quick Note：`raycast-extension/src/capture-to-journal.tsx`
