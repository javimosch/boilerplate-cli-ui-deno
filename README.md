# boilerplate-cli-ui-deno

**Agent-first CLI + Web UI boilerplate for Deno.** Builds to a single binary with no runtime dependencies.
Part of [SuperCLI](https://github.com/javimosch/supercli) - build CLI/UI plugins fast for 2026.
<!-- FLEET-TABLE:BEGIN -->

| Stack | Binary | Cold start | Idle RSS | Specs | SDK |
|-------|--------|-----------:|---------:|:-----:|----:|
| [machin + React 18 CDN](https://github.com/javimosch/boilerplate-cli-ui-machin) | 63 KB | 2 ms | 3.1 MB | 28/28 | ~2 MB |
| [machin isomorphic (wasm UI)](https://github.com/javimosch/boilerplate-cli-ui-machin-isomorphic) | 76 KB | 2 ms | 3.1 MB | 28/28 | ~2 MB |
| [Nim + Vue 3](https://github.com/javimosch/boilerplate-cli-ui-nim) | 372 KB | 1 ms | 2.0 MB | 2/21 | ~50 MB |
| [C++ + Vue 3](https://github.com/javimosch/boilerplate-cli-ui-cpp) | 692 KB | 4 ms | 7.4 MB | 28/28 | ~2000 MB |
| [Zig + Vue 3](https://github.com/javimosch/boilerplate-cli-ui-zig) | 971 KB | 1 ms | 2.0 MB | 28/28 | ~50 MB |
| [Rust + vanilla JS](https://github.com/javimosch/boilerplate-cli-ui-rust) | 1003 KB | 1 ms | 2.5 MB | 28/28 | ~800 MB |
| [V + Vue 3](https://github.com/javimosch/boilerplate-cli-ui-v) | 1.2 MB | 2 ms | 2.5 MB | 5/20 | ~5 MB |
| [Crystal + Vue 3](https://github.com/javimosch/boilerplate-cli-ui-crystal) | 3.1 MB | 3 ms | 5.9 MB | 5/20 | ~50 MB |
| [Go + Vue 3 CDN](https://github.com/javimosch/boilerplate-cli-ui-go-v2-vue) | 5.5 MB | 3 ms | 5.8 MB | 28/28 | ~150 MB |
| [Go + React 18 CDN](https://github.com/javimosch/boilerplate-cli-ui-go-v2-react) | 5.5 MB | 4 ms | 5.6 MB | 28/28 | ~150 MB |
| [Dart + Vue 3](https://github.com/javimosch/boilerplate-cli-ui-dart) | 6.3 MB | 6 ms | 7.2 MB | 2/21 | ~400 MB |
| **Deno + vanilla JS** | **76.1 MB** | **25 ms** | **45.0 MB** | **28/28** | **~100 MB** |
| [Node.js + vanilla JS](https://github.com/javimosch/boilerplate-cli-ui-node) | 122.8 MB | 62 ms | 53.3 MB | 28/28 | ~500 MB |

Not measured in this run (toolchain unavailable): [Python + React CDN](https://github.com/javimosch/boilerplate-cli-ui-python), [.NET 8 + Vue 3](https://github.com/javimosch/boilerplate-cli-ui-dotnet).

*Binary size, cold start (median of 11 `version` runs) and idle RSS measured on Linux-x86_64 on 2026-09-08. **Specs** is the [cli-spec-conformance](https://github.com/javimosch/cli-spec-conformance) score across cli-output-spec, cli-guide-spec and cli-daemon-spec, measured by running each binary — not claimed. Every row builds the same reference app; a row at 28/28 also implements the same agent-first contract, which is what makes its size comparable to the others. Rows below 28/28 have not been converted yet, so read their sizes as a floor. Regenerate with [boilerplate-cli-ui-fleet](https://github.com/javimosch/boilerplate-cli-ui-fleet); never edit this table by hand.*

<!-- FLEET-TABLE:END -->
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
| Node.js SEA | `npm run build` | ~123MB | ~500MB+ |
| Bun | `npm run build:bun` | ~100MB |
| **Deno** | `deno task build` | ~55-70MB |
## Project Structure
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
## CLI Usage
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
## Build
# Output
dist/boilerplate-cli-ui-deno
### Binary Details
- **Runtime**: Deno (embedded)
- **Platform**: Linux x86-64
- **Dependencies**: None
- **Build tool**: deno compile
## Configuration
### Environment Variables
PORT=3000
CLIUI_LOG_LEVEL=info
### Config File
`.cliui-config.json`:
```json
{
  "setting": "value",
  "speedPreset": "normal"
}
## Development
# Run with permissions
deno run --allow-net --allow-read --allow-write --allow-env src/cli.ts
## License
MIT
