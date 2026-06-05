# boilerplate-cli-ui-deno

**Agent-first CLI + Web UI boilerplate for Deno.** Builds to a single binary with no runtime dependencies.

Part of [SuperCLI](https://github.com/javimosch/supercli) - build CLI/UI plugins fast for 2026.

| Stack | Repo | Binary |
|-------|------|--------|
| Go + inline HTML | [boilerplate-cli-ui-go](https://github.com/javimosch/boilerplate-cli-ui-go) | ~5MB |
| Go + Vue 3 CDN | [boilerplate-cli-ui-go-v2-vue](https://github.com/javimosch/boilerplate-cli-ui-go-v2-vue) | ~5MB |
| Go + React 18 CDN | [boilerplate-cli-ui-go-v2-react](https://github.com/javimosch/boilerplate-cli-ui-go-v2-react) | ~5MB |
| **Deno + vanilla JS** | **boilerplate-cli-ui-deno** | **~76MB** |
| Node.js + vanilla JS | [boilerplate-cli-ui-node](https://github.com/javimosch/boilerplate-cli-ui-node) | ~123MB |
| Python + React CDN | [boilerplate-cli-ui-python](https://github.com/javimosch/boilerplate-cli-ui-python) | ~10MB |
| Rust + vanilla JS | [boilerplate-cli-ui-rust](https://github.com/javimosch/boilerplate-cli-ui-rust) | ~1.1MB |
| .NET 8 + Vue 3 | [boilerplate-cli-ui-dotnet](https://github.com/javimosch/boilerplate-cli-ui-dotnet) | ~89MB |
| C++ + Vue 3 | [boilerplate-cli-ui-cpp](https://github.com/javimosch/boilerplate-cli-ui-cpp) | ~493KB |
| Nim + Vue 3 | [boilerplate-cli-ui-nim](https://github.com/javimosch/boilerplate-cli-ui-nim) | ~364KB |
| Zig + Vue 3 | [boilerplate-cli-ui-zig](https://github.com/javimosch/boilerplate-cli-ui-zig) | ~190KB |
| Dart + Vue 3 | [boilerplate-cli-ui-dart](https://github.com/javimosch/boilerplate-cli-ui-dart) | ~6.4MB |
|| V + Vue 3 | [boilerplate-cli-ui-v](https://github.com/javimosch/boilerplate-cli-ui-v) | ~1.2MB |
|| Crystal + Vue 3 | [boilerplate-cli-ui-crystal](https://github.com/javimosch/boilerplate-cli-ui-crystal) | ~3.1MB |

## Philosophy

**CLI-Native, Web-Enabled, Agent-Friendly**

- **JSON-by-default**: All commands output JSON for machine parsing
- **`--human` opt-in**: Human-readable output when explicitly requested
- **Semantic exit codes**: Structured error communication (80-119 range)
- **Single binary**: No runtime dependencies via Deno compile

## Features

- 🚀 **CLI Mode** - Interactive menu with configuration
- 🌐 **Web UI** - Modern responsive interface with API
- ⚡ **Speed Controls** - Performance presets (turbo/fast/normal/gentle)
- 💾 **Persistent Config** - Settings saved between sessions
- 📊 **Progress Tracking** - Real-time streaming updates
- 📦 **Standalone Binary** - No runtime required to run
- 🤖 **Agent-Friendly** - JSON output, structured errors, env vars
- 🦕 **Deno Native** - TypeScript first, secure by default

## Quick Start

```bash
# Run CLI
deno task dev

# Run Web UI
deno task dev:ui

# Build standalone binary
deno task build
```

## Binary Size Comparison

| Runtime | Command | Size |
|---------|---------|------|
| Node.js SEA | `npm run build` | ~123MB |
| Bun | `npm run build:bun` | ~100MB |
| **Deno** | `deno task build` | ~55-70MB |

## Project Structure

```
boilerplate-cli-ui-deno/
├── src/
│   ├── cli.ts                 # CLI entry point
│   └── server.ts              # Web server
├── interfaces/webui/
│   └── public/                # Frontend (HTML/CSS/JS)
├── deno.json                  # Deno configuration
├── build.ts                   # Binary builder
├── AGENTS.md                  # Agent guidelines
└── README.md
```

## CLI Usage

```bash
# Interactive menu
./boilerplate-cli-ui-deno

# Show help (JSON)
./boilerplate-cli-ui-deno --help

# Dashboard (JSON)
./boilerplate-cli-ui-deno dashboard

# Run process
./boilerplate-cli-ui-deno process --setting value --speed normal

# Launch Web UI
./boilerplate-cli-ui-deno --ui
```

## Web UI

- **URL**: http://localhost:3000
- **Features**: Config, progress, stats, health check
- **API**: All endpoints return JSON

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/config` | Get configuration |
| POST | `/api/config` | Save configuration |
| GET | `/api/stats` | System statistics |
| POST | `/api/process` | Run process (streaming) |

## Agent-First Design

See [AGENTS.md](./AGENTS.md) for:
- Coding rules and file size limits
- JSON output patterns
- Semantic exit codes
- Error handling patterns
- Configuration management

### Quick Reference

```typescript
// Default JSON output
console.log(JSON.stringify({ status: "success", data: result }));

// Structured error
const error: CLIError = {
  code: 85,
  type: "invalid_argument",
  message: "Invalid input",
  recoverable: true,
  suggestions: ["Check the value"],
};
console.log(JSON.stringify({ error }));

// Exit codes
Deno.exit(0);   // Success
Deno.exit(85);  // Invalid argument
Deno.exit(92);  // Not found
Deno.exit(110); // Internal error
```

## Build

```bash
# Build standalone binary
deno task build

# Output
dist/boilerplate-cli-ui-deno
```

### Binary Details

- **Runtime**: Deno (embedded)
- **Platform**: Linux x86-64
- **Dependencies**: None
- **Build tool**: deno compile

## Configuration

### Environment Variables

```bash
PORT=3000
CLIUI_LOG_LEVEL=info
```

### Config File

`.cliui-config.json`:
```json
{
  "setting": "value",
  "speedPreset": "normal"
}
```

## Development

```bash
# Run CLI
deno task dev

# Run Web UI
deno task dev:ui

# Run with permissions
deno run --allow-net --allow-read --allow-write --allow-env src/cli.ts
```

## License

MIT
