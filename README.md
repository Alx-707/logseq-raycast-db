# Logseq DB Raycast Extension

Search and quick capture to your Logseq DB graph directly from Raycast.

![Demo](./assets/demo.gif)

## Features

- 🔍 **Search Logseq** - Full-text search across all your Logseq pages
- ⚡ **Quick Capture** - Capture notes with tags and priority levels
- 📝 **Quick Note** - Fastest way to jot down a quick thought
- 🔄 **Graph Switching** - Easily switch between multiple graphs
- 🔗 **Deep Links** - Open results directly in Logseq

## Requirements

1. **Logseq DB Version** - This extension is designed for the new Logseq DB version (not the file-based version)
2. **@logseq/cli** - Install the CLI: `npm install -g @logseq/cli`
3. **HTTP Server** - Run the companion HTTP server (included in this repo)
4. **API Token** (for Quick Capture) - Enable HTTP API Server in Logseq settings

## Installation

### 1. Install the HTTP Server

```bash
cd http-server
python3 logseq_server.py --api-token YOUR_TOKEN
```

Or set the token via environment variable:

```bash
export LOGSEQ_API_SERVER_TOKEN=your-token
python3 logseq_server.py
```

### 2. Install the Raycast Extension

```bash
cd raycast-extension
npm install
npm run dev
```

### 3. Configure the Extension

1. Open Raycast Preferences (⌘,)
2. Navigate to Extensions > Logseq DB
3. Set your preferences:
   - **Server URL**: Default is `http://localhost:8765`
   - **API Token**: Your Logseq HTTP API Server token (for Quick Capture)

## Commands

### Search Logseq

Search pages in your Logseq DB graph.

- Use the dropdown to switch between graphs
- Results open directly in Logseq
- Copy page links or titles to clipboard

### Quick Capture to Logseq

Capture notes with additional options:

- **Tags**: Add multiple tags (comma or space separated)
- **Priority**: Set priority level (A/B/C)
- **Template**: Customize the capture format in preferences

### Quick Note

The fastest way to capture a thought:

- Single text field
- Press Enter to capture
- **Automatically appends to today's journal** (works even if Logseq has no page open)

## API Token Setup

To use Quick Capture features:

1. Open Logseq Desktop
2. Go to Settings → Features → HTTP APIs Server
3. Enable the server and copy the token
4. Paste the token in Raycast extension preferences

## HTTP Server API

The companion HTTP server provides these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/version` | GET | Server version |
| `/list` | GET | List all graphs |
| `/show?graph=NAME` | GET | Show graph info |
| `/search?q=QUERY&graph=NAME` | GET | Search pages |
| `/query` | POST | Execute Datalog query |
| `/append` | POST | Append content to current page (requires API token) |
| `/append-to-journal` | POST | Append content to today's journal (requires API token) |

### Example: Append Content

```bash
curl -X POST http://localhost:8765/append \
  -H "Content-Type: application/json" \
  -d '{"content": "My quick note", "token": "your-api-token"}'
```

## Development

### Project Structure

```
logseq-db-raycast/
├── raycast-extension/
│   ├── src/
│   │   ├── search-logseq.tsx      # Search command
│   │   ├── quick-capture.tsx      # Full capture form
│   │   ├── capture-to-journal.tsx # Quick note command
│   │   ├── services/
│   │   │   └── logseq-api.ts      # API service
│   │   ├── hooks/
│   │   │   └── useGraphs.ts       # Graph selection hook
│   │   └── types/
│   │       └── logseq.ts          # TypeScript types
│   └── package.json
├── http-server/
│   └── logseq_server.py           # Python HTTP server
└── README.md
```

### Building

```bash
cd raycast-extension
npm run build
```

### Linting

```bash
npm run lint
npm run fix-lint
```

## Troubleshooting

### "Cannot connect to Logseq HTTP server"

1. Make sure the HTTP server is running: `python3 logseq_server.py`
2. Check that the server URL in preferences matches (default: `http://localhost:8765`)
3. Verify no firewall is blocking the connection

### "Missing API token"

1. Enable HTTP API Server in Logseq settings
2. Copy the token from Logseq settings
3. Paste it in Raycast extension preferences

### "append command failed"

The `append` command requires Logseq desktop to be running with HTTP API Server enabled. Make sure:

1. Logseq desktop app is open
2. HTTP API Server is enabled in settings
3. The correct token is configured

## Credits

- Original search extension by [kerim](https://github.com/kerim/raycast-logseq-search)
- HTTP server by [kerim](https://github.com/kerim/logseq-http-server)
- Quick Capture implementation by shawn

## License

MIT
