// The embedded guide and command catalog (cli-guide-spec, cli-output-spec §4).
//
// Compiled into the binary by `deno compile`: an agent that lands on a machine
// with this binary and no network can still learn the tool. Never fetched at
// runtime.

export const TOOL = "boilerplate-cli-ui-deno";
export const VERSION = "1.0.0";

export function guideJSON(): string {
  return JSON.stringify({
    [TOOL]: "A Deno CLI with an embedded web UI, compiled to a single binary.",
    version: VERSION,
    one_liner:
      "Starts a Deno.serve HTTP server that serves a dashboard at / and a JSON API at /api/*, " +
      "from one `deno compile` binary with the UI inlined at build time — the runtime ships inside it.",
    model: {
      binary: "one executable produced by `deno compile`; build.ts inlines the UI into the server source first.",
      server: "Deno.serve bound to an explicit hostname:port — never every interface by default.",
      daemon: "re-execs itself as `serve`, detached, with /_health as the source of truth for liveness.",
      contract:
        "agent-first: data on stdout, context on stderr, semantic exit codes, typed errors, an embedded guide. " +
        "Every command is non-interactive — there is no prompt to answer.",
    },
    loop: [
      "./build.sh — deno compile with the UI inlined",
      `./${TOOL} serve — foreground on 127.0.0.1:8080`,
      "open http://127.0.0.1:8080/ for the UI, or curl /api/status for JSON",
      `./${TOOL} daemon start — background it instead`,
      `./${TOOL} daemon stop — stop it`,
    ],
    concepts: {
      "embedded UI": "build.ts substitutes the UI files into the server module before `deno compile`.",
      "loopback default":
        "serve binds 127.0.0.1 unless --host says otherwise. Binding the whole network is deliberate.",
      "shutdown token":
        "off-loopback, POST /_shutdown requires X-Shutdown-Token matching $SHUTDOWN_TOKEN, or it answers 403 and keeps running.",
      "exit codes":
        "0 ok, 80-89 input, 90-99 state, 100-109 external, 110-119 internal. The code equals .error.code in the body.",
    },
    commands: {
      server: [
        `${TOOL} serve [--host H] [--port N]`,
        `${TOOL} daemon start [--port N]`,
        `${TOOL} daemon stop [--port N]`,
        `${TOOL} daemon status [--port N]`,
      ],
      app: [`${TOOL} dashboard`, `${TOOL} process --setting S [--speed turbo|fast|normal|gentle]`],
      introspection: [`${TOOL} guide [--human]`, `${TOOL} help-json`, `${TOOL} version [--json]`],
    },
    examples: [
      { goal: "serve the UI on a custom port", do: [`./${TOOL} serve --port 3000`] },
      {
        goal: "background it and confirm it is up",
        do: [`./${TOOL} daemon start --port 3000`, `./${TOOL} daemon status --port 3000`],
      },
      {
        goal: "expose it on the LAN with a kill switch that needs a token",
        do: [`SHUTDOWN_TOKEN=s3cret ./${TOOL} serve --host 0.0.0.0 --port 8080`],
      },
    ],
    gotchas: [
      "There is no interactive mode. Every command runs to completion without asking anything, which is what makes it drivable by an agent.",
      "serve binds 127.0.0.1 by default. If you expected it on the LAN, pass --host 0.0.0.0 — and then set SHUTDOWN_TOKEN, or /_shutdown answers 403 to everyone.",
      "daemon start is idempotent: called twice it reports the running instance instead of racing a second process onto the port.",
      "daemon stop against a stopped daemon exits 0 — a no-op success, not an error.",
      "Progress lines go to stderr. An agent parsing stdout sees only data.",
    ],
    see_also: ["https://cli-specs.intrane.fr"],
  });
}

export function guideMarkdown(): string {
  return `# ${TOOL}

A Deno CLI with an embedded web UI, compiled to a single binary.

## Model

- One executable from \`deno compile\`; the runtime and UI ship inside it.
- Deno.serve bound to an explicit hostname:port.
- The daemon re-execs itself as \`serve\`; /_health is liveness.
- Agent-first: data on stdout, context on stderr, semantic exit codes, and no
  interactive prompt anywhere.

## Loop

1. \`./build.sh\`
2. \`./${TOOL} serve\`
3. Open http://127.0.0.1:8080/ or curl /api/status.
4. \`./${TOOL} daemon start\` to background it.
5. \`./${TOOL} daemon stop\` to stop it.

## Commands

- \`serve [--host H] [--port N]\`
- \`daemon start|stop|status [--port N]\`
- \`dashboard\`, \`process --setting S [--speed …]\`
- \`guide [--human]\`, \`help-json\`, \`version [--json]\`

## Gotchas

- There is no interactive mode; nothing ever waits for input.
- \`serve\` binds 127.0.0.1 by default; \`--host 0.0.0.0\` is deliberate.
- Off-loopback, \`POST /_shutdown\` needs \`X-Shutdown-Token\` = \`$SHUTDOWN_TOKEN\`.
- \`daemon start\` twice is idempotent; \`daemon stop\` when stopped exits 0.
`;
}

export function llmsTxt(): string {
  return `# ${TOOL}

A Deno CLI with an embedded web UI. One compiled binary.

## Drive it

    ${TOOL} serve [--host H] [--port N]
    ${TOOL} daemon start|stop|status [--port N]

JSON on stdout, context on stderr, exit 0/80-119. Never interactive.

## Learn it

    ${TOOL} guide      # embedded, JSON
    ${TOOL} help-json  # command catalog

HTTP: GET /  GET /api/status  GET /_health  POST /_shutdown  GET /guide
`;
}

export function helpJSON(): string {
  return JSON.stringify({
    version: "1.0",
    tool: TOOL,
    tool_version: VERSION,
    commands: [
      {
        name: "serve",
        summary: "run the HTTP server in the foreground",
        flags: [
          { name: "--host", summary: "bind address", default: "127.0.0.1", env: "HOST" },
          { name: "--port", summary: "port", default: "8080", env: "PORT" },
        ],
      },
      { name: "daemon start", summary: "start the server in the background (idempotent)" },
      { name: "daemon stop", summary: "stop the background server (no-op success if stopped)" },
      { name: "daemon status", summary: "report background server status" },
      { name: "dashboard", summary: "current configuration and runtime as JSON" },
      {
        name: "process",
        summary: "run the sample process",
        flags: [
          { name: "--setting", summary: "the setting to process", required: true },
          { name: "--speed", summary: "turbo|fast|normal|gentle", default: "normal" },
        ],
      },
      {
        name: "guide",
        summary: "the embedded operator guide",
        flags: [{ name: "--human", summary: "markdown instead of JSON" }],
      },
      { name: "help-json", summary: "this machine-readable command catalog" },
      { name: "version", summary: "print the version", flags: [{ name: "--json", summary: "JSON output" }] },
    ],
    endpoints: [
      { method: "GET", path: "/", summary: "the embedded web UI" },
      { method: "GET", path: "/api/status", summary: "app status JSON" },
      { method: "GET", path: "/_health", summary: "liveness: {ok,service,pid}" },
      { method: "POST", path: "/_shutdown", summary: "stop the server; token-gated off-loopback" },
      { method: "GET", path: "/guide", summary: "the guide over HTTP" },
      { method: "GET", path: "/llms.txt", summary: "the short agent-facing README" },
    ],
    exit_codes: {
      "0": "success",
      "80": "missing argument",
      "85": "unknown command or invalid argument",
      "90": "precondition failed (port unavailable, forbidden)",
      "100": "external failure (the daemon did not answer)",
      "110": "internal error",
    },
    env: [
      { name: "PORT", summary: "default port" },
      { name: "HOST", summary: "default bind address" },
      { name: "SHUTDOWN_TOKEN", summary: "required by POST /_shutdown when bound off-loopback" },
    ],
    see_also: [`${TOOL} guide`, "https://cli-specs.intrane.fr"],
  });
}
