# AGENTS.md - Agent-First Deno CLI+WebUI

This document guides AI agents in understanding, extending, and maintaining `boilerplate-cli-ui-deno`.

## Project Philosophy

This boilerplate implements **agent-first CLI design**:

- **JSON-by-default**: All CLI commands output JSON unless `--human` flag
- **Structured errors**: Error objects with code, type, recoverable, suggestions
- **Output separation**: stdout for data, stderr for logs/progress
- **Single binary**: Builds to standalone executable via Deno compile
- **Agent-first HTTP**: JSON API at `/api/*`, UI at `/`
- **No interactivity by default**: All operations non-interactive unless explicitly requested

## Project Structure

```
boilerplate-cli-ui-deno/
├── src/
│   ├── cli.ts                 # CLI entry point and command routing
│   └── server.ts              # Web server with embedded static files
├── interfaces/webui/
│   └── public/                # Frontend (HTML/CSS/JS)
├── deno.json                  # Deno configuration
├── build.ts                   # Binary builder
├── AGENTS.md                  # This file
└── README.md
```

## Coding Rules

### File Size Limits

- **Max 500 LOC per TypeScript file** - Split files that exceed this
- **Max 300 LOC per documentation file** - Keep docs concise
- **Max 200 LOC per test file** - Split complex tests

### Module Organization

| Directory | Responsibility |
|-----------|----------------|
| `src/` | Core application logic (CLI, server) |
| `interfaces/` | User interfaces (webui) |
| `dist/` | Build output (binary) |

### Naming Conventions

- **TS files**: `kebab-case.ts` for files
- **Functions**: `camelCase` for functions
- **Interfaces**: `PascalCase` for interfaces/types
- **Constants**: `UPPER_SNAKE_CASE` for constants
- **Config keys**: `camelCase` in JSON

### Agent-First Output Patterns

**Default JSON Output (CLI):**
```typescript
// Always output JSON by default
const result = {
  status: "success",
  data: { /* ... */ },
  timestamp: new Date().toISOString()
};
console.log(JSON.stringify(result, null, 2));
```

**Human-Readable Output (opt-in):**
```typescript
// Only when --human flag is passed
if (humanMode) {
  console.log(`✅ Success: ${result.data.id}`);
} else {
  console.log(JSON.stringify(result, null, 2));
}
```

**Structured Errors:**
```typescript
interface CLIError {
  code: number;
  type: string;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
  suggestions: string[];
}

// Usage
const error: CLIError = {
  code: 85,
  type: "invalid_argument",
  message: "Invalid port number",
  details: { port: 70000, valid_range: "1-65535" },
  recoverable: true,
  suggestions: ["Use a port between 1 and 65535"]
};
console.log(JSON.stringify({ error }));
```

**Output Separation:**
```typescript
// Data goes to stdout
console.log(JSON.stringify(result));

// Logs go to stderr
console.error("Processing...", JSON.stringify({ type: "progress", percent: 50 }));
```

### Semantic Exit Codes

```typescript
const EXIT_CODES = {
  SUCCESS: 0,
  INVALID_ARGUMENT: 85,
  BAD_PERMISSIONS: 86,
  RESOURCE_NOT_FOUND: 92,
  CONNECTION_TIMEOUT: 105,
  INTERNAL_ERROR: 110
} as const;

// Usage
if (port < 1 || port > 65535) {
  Deno.exit(EXIT_CODES.INVALID_ARGUMENT);
}
```

## API Response Patterns

### JSON Response Structure

```typescript
// Success response
new Response(JSON.stringify({
  status: "ok",
  data: { /* ... */ },
  timestamp: new Date().toISOString()
}), { headers: { "Content-Type": "application/json" } });

// Error response
new Response(JSON.stringify({
  status: "error",
  error: {
    code: 400,
    type: "invalid_request",
    message: "Missing required parameter",
    recoverable: true,
    suggestions: ["Provide an id parameter"]
  }
}), { status: 400, headers: { "Content-Type": "application/json" } });
```

### Streaming Response Pattern

```typescript
const stream = new ReadableStream({
  start(controller) {
    const encoder = new TextEncoder();
    
    // Send progress
    controller.enqueue(encoder.encode(JSON.stringify({
      type: "progress",
      percentage: 50,
      message: "Processing..."
    }) + "\n"));
    
    // Send completion
    controller.enqueue(encoder.encode(JSON.stringify({
      type: "complete",
      result: { /* ... */ }
    }) + "\n"));
    
    controller.close();
  }
});

return new Response(stream, {
  headers: { "Content-Type": "application/json" }
});
```

## Configuration Management

### Environment Variables

```bash
PORT=3000
CLIUI_LOG_LEVEL=info
```

### Config File Pattern

```typescript
interface Config {
  setting: string;
  speedPreset: string;
}

async function loadConfig(): Promise<Config> {
  try {
    const data = await Deno.readTextFile(".cliui-config.json");
    return JSON.parse(data);
  } catch {
    return { setting: "", speedPreset: "normal" };
  }
}
```

## Adding New Commands

### 1. Add Command Handler

```typescript
// src/commands/mycommand.ts
export async function myCommand(params: Record<string, unknown>): Promise<void> {
  const result = {
    status: "success",
    command: "mycommand",
    params,
    timestamp: new Date().toISOString()
  };
  console.log(JSON.stringify(result, null, 2));
}
```

### 2. Add CLI Routing (in cli.ts)

```typescript
if (args.includes("mycommand")) {
  await myCommand({ /* params */ });
}
```

### 3. Add API Endpoint (in server.ts)

```typescript
if (path === "/api/mycommand" && req.method === "POST") {
  const data = await req.json();
  const result = await myCommand(data);
  return Response.json(result);
}
```

## Testing Guidelines

### Test Structure

```typescript
// tests/mycommand_test.ts
import { assertEquals } from "https://deno.land/std/assert/assert_equals.ts";
import { myCommand } from "../src/commands/mycommand.ts";

Deno.test("myCommand returns success", async () => {
  // Test implementation
});
```

### Agent-Friendly Test Patterns

- Test JSON schema validation
- Test semantic exit codes
- Test error format structure
- Test `--human` mode output
- Test stderr/stdout separation
- Test environment variable handling

## Agent-First Design Checklist

When extending this boilerplate, ensure:

- [ ] CLI commands default to JSON output
- [ ] `--human` flag provides human-readable output
- [ ] Semantic exit codes for all error paths
- [ ] Structured error output with recovery hints
- [ ] Output separation (stdout data, stderr logs)
- [ ] No interactive prompts by default
- [ ] API endpoints return JSON with stable structure
- [ ] Environment variables for configuration
- [ ] Max 500 LOC per file
- [ ] Clear module responsibilities
- [ ] Comprehensive error handling
- [ ] Proper error propagation

## Build & Binary

### Development

```bash
deno task dev          # Run CLI
deno task dev:ui       # Run web UI
```

### Production Build

```bash
deno task build        # Build standalone binary
./dist/boilerplate-cli-ui-deno --help     # Test CLI
./dist/boilerplate-cli-ui-deno --ui       # Test Web UI
```

### Binary Details

- **Size**: ~55-70MB (includes Deno runtime)
- **Platform**: Linux x86-64
- **Dependencies**: None (fully self-contained)
- **Build tool**: deno compile

## Deno-Specific Patterns

### File Operations

```typescript
// Read
const data = await Deno.readTextFile("file.json");

// Write
await Deno.writeTextFile("file.json", JSON.stringify(data));

// Check existence
try {
  await Deno.stat("file.json");
} catch {
  // File doesn't exist
}
```

### HTTP Server

```typescript
Deno.serve({ port: 3000 }, async (req) => {
  const url = new URL(req.url);
  
  if (url.pathname === "/api/health") {
    return Response.json({ status: "ok" });
  }
  
  return new Response("Not found", { status: 404 });
});
```

### Permissions

```bash
# Run with specific permissions
deno run --allow-net --allow-read --allow-write src/cli.ts

# Run with all permissions
deno run --allow-all src/cli.ts
```

## Common Patterns

### Reading Configuration

```typescript
const config = await loadConfig();
console.log(config.setting);
```

### Error Handling

```typescript
try {
  const result = await performOperation();
  console.log(JSON.stringify(result));
} catch (err) {
  const error: CLIError = {
    code: EXIT_CODES.INTERNAL_ERROR,
    type: "internal_error",
    message: err.message,
    recoverable: false,
    suggestions: ["Check logs for details"]
  };
  console.error(JSON.stringify({ error }));
  Deno.exit(EXIT_CODES.INTERNAL_ERROR);
}
```

## Future Enhancements

- [ ] Add comprehensive JSON schema validation
- [ ] Add `--help-json` command for machine-readable help
- [ ] Add `--schema` flag for schema discovery
- [ ] Add authentication for web UI
- [ ] Add HTTPS support
- [ ] Add cross-platform builds (macOS, Windows)
- [ ] Add DenoFresh integration option

## References

- [Deno Manual](https://deno.land/manual)
- [Deno Deploy](https://deno.com/deploy)
- [Command Line Interface Guidelines](https://clig.dev/)
