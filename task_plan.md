# Logseq DB Raycast Extension - 开发计划

## 目标
基于 kerim/raycast-logseq-search 二次开发，添加 **Quick Capture（快捷记录）** 等写入功能，打造完整的 Logseq DB 版本 Raycast 扩展。

## 架构

```
Raycast Extension (TypeScript)
        │
        │ HTTP (localhost:8765)
        ▼
logseq-http-server (Python)
        │
        │ subprocess
        ▼
@logseq/cli → Logseq DB (SQLite)
```

## 阶段

### Phase 1: 项目初始化 `pending`
- [ ] Clone kerim/raycast-logseq-search 代码
- [ ] Clone kerim/logseq-http-server 代码
- [ ] 安装依赖，验证现有功能正常

### Phase 2: 扩展 HTTP Server `pending`
- [ ] 添加 `/append` 端点（写入 block 到指定 page）
- [ ] 添加 `/today` 端点（获取今日日记页面名称）
- [ ] 测试 CLI 的 append 命令
- [ ] 验证写入功能

### Phase 3: 重构 Raycast 扩展架构 `pending`
- [ ] 提取 `services/logseq-api.ts` 统一 API 层
- [ ] 提取 `hooks/useGraphs.ts` Graph 选择逻辑
- [ ] 提取 `utils/preferences.ts` 偏好设置

### Phase 4: 实现 Quick Capture 命令 `pending`
- [ ] 创建 `quick-capture.tsx` 命令
- [ ] 实现内容输入表单
- [ ] 实现 Graph 选择
- [ ] 实现目标页面选择（Inbox / 今日日记 / 自定义）
- [ ] 添加时间戳选项
- [ ] 错误处理和 Toast 提示

### Phase 5: 增强功能 `pending`
- [ ] 实现 Add Task 命令（带 TODO marker）
- [ ] 实现 Create Page 命令
- [ ] 优化搜索体验

### Phase 6: 测试和文档 `pending`
- [ ] 端到端测试
- [ ] 编写 README
- [ ] 截图和使用说明

## 技术决策

| 决策 | 选择 | 原因 |
|------|------|------|
| API 层 | HTTP Server | CLI 无法直接从 Raycast 调用，需要中间层 |
| 写入方式 | `logseq append` | CLI 官方支持，稳定可靠 |
| 目标页面 | 可配置 | 不同用户习惯不同 |

## 文件结构（目标）

```
raycast-logseq-search/
├── src/
│   ├── search-logseq.tsx      # 现有
│   ├── quick-capture.tsx      # 新增
│   ├── add-task.tsx           # 新增
│   ├── services/
│   │   └── logseq-api.ts      # 新增
│   ├── hooks/
│   │   └── useGraphs.ts       # 新增
│   └── utils/
│       └── preferences.ts     # 新增
├── package.json               # 更新
└── README.md                  # 更新

logseq-http-server/
├── logseq_server.py           # 更新：添加写入端点
└── README.md                  # 更新
```

## 错误记录

| 错误 | 尝试 | 解决方案 |
|------|------|----------|
| (待记录) | | |

## 进度检查点

- [ ] Phase 1 完成
- [ ] Phase 2 完成
- [ ] Phase 3 完成
- [ ] Phase 4 完成
- [ ] Phase 5 完成
- [ ] Phase 6 完成
