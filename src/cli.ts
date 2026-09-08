#!/usr/bin/env -S deno run --allow-all

// boilerplate-cli-ui-deno — a Deno CLI with an embedded web UI.
//
// The command surface follows the agent-first CLI specs
// (https://cli-specs.intrane.fr):
//   cli-output-spec  data on stdout, context on stderr, exit codes 80-119,
//                    typed errors, help-json, non-interactive by default
//   cli-guide-spec   `guide`, embedded in the binary
//   cli-daemon-spec  `serve --host --port`, /_health, /_shutdown,
//                    `daemon start|stop|status`

import { guideJSON, guideMarkdown, helpJSON, TOOL, VERSION } from "./guide.ts";
import { serveHttp } from "./server.ts";

// ─── Types ──────────────────────────────────────────────────────
interface Config {
  setting: string;
  speedPreset: string;
  lastUpdated?: string;
}

// ─── Exit Codes (cli-output-spec §2) ────────────────────────────
const EXIT = {
  SUCCESS: 0,
  MISSING_ARG: 80,
  INVALID_ARGUMENT: 85,
  PRECONDITION: 90,
  EXTERNAL: 100,
  INTERNAL: 110,
} as const;

const PID_FILE = "/tmp/boilerplate-cli-ui-deno.pid";
const LOG_FILE = "/tmp/boilerplate-cli-ui-deno.log";
const DEFAULT_PORT = 8080;
const DEFAULT_HOST = "127.0.0.1";

// ─── Speed Presets ──────────────────────────────────────────────
const SPEED_PRESETS = {
  turbo: { name: "Turbo", sleepBetweenOps: 0, batchSize: 500 },
  fast: { name: "Fast", sleepBetweenOps: 10, batchSize: 200 },
  normal: { name: "Normal", sleepBetweenOps: 50, batchSize: 100 },
  gentle: { name: "Gentle", sleepBetweenOps: 100, batchSize: 50 },
} as const;

// ─── Config Management ──────────────────────────────────────────
const CONFIG_FILE = ".cliui-config.json";

async function loadConfig(): Promise<Config> {
  try {
    return JSON.parse(await Deno.readTextFile(CONFIG_FILE));
  } catch {
    return { setting: "", speedPreset: "normal" };
  }
}

// ─── Output Helpers ─────────────────────────────────────────────

function emit(data: unknown): void {
  console.log(JSON.stringify(data));
}

/// Emits a typed error on stdout and exits with the matching code. The exit
/// status and .error.code are the same number by construction (§2, §3).
function die(code: number, type: string, message: string, suggestion: string): never {
  emit({
    ok: false,
    error: {
      code,
      type,
      message,
      recoverable: code >= 100 && code <= 109,
      suggestions: [suggestion],
    },
  });
  Deno.exit(code);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Flags ──────────────────────────────────────────────────────

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

/// Reads --name value or --name=value.
function flagValue(args: string[], name: string): string | undefined {
  const prefix = `${name}=`;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name && i + 1 < args.length) return args[i + 1];
    if (args[i].startsWith(prefix)) return args[i].slice(prefix.length);
  }
  return undefined;
}

/// The host default MUST be loopback (cli-daemon-spec §1): serving the whole
/// network is a deliberate act, never something that happens because nobody
/// passed a flag.
function resolveHost(args: string[]): string {
  return flagValue(args, "--host") ?? Deno.env.get("HOST") ?? DEFAULT_HOST;
}

function resolvePort(args: string[]): number {
  const raw = flagValue(args, "--port") ?? flagValue(args, "-p") ??
    Deno.env.get("PORT") ?? String(DEFAULT_PORT);
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    die(EXIT.INVALID_ARGUMENT, "bad_flag_value",
      `--port must be a number, got "${raw}"`,
      `${TOOL} serve --port 8080`);
  }
  return port;
}

// ─── Daemon lifecycle (cli-daemon-spec §4) ──────────────────────
//
// /_health is the source of truth for liveness, not the pid file, which goes
// stale when a process dies without cleaning up. Every subcommand is idempotent.

async function probeHealth(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/_health`, {
      signal: AbortSignal.timeout(500),
    });
    await res.body?.cancel();
    return res.status === 200;
  } catch {
    return false;
  }
}

/// Polls every 100ms for up to 5s, rather than sleeping a fixed amount (§4).
async function waitFor(port: number, want: boolean): Promise<boolean> {
  for (let i = 0; i < 50; i++) {
    if (await probeHealth(port) === want) return true;
    await sleep(100);
  }
  return false;
}

async function removePid(): Promise<void> {
  try {
    await Deno.remove(PID_FILE);
  } catch { /* already gone */ }
}

/// Idempotent: an already-healthy port means report it and succeed, rather than
/// racing a second process onto it (§4).
async function daemonStart(host: string, port: number): Promise<void> {
  if (await probeHealth(port)) {
    emit({ ok: true, running: true, already_running: true, port });
    return;
  }

  // Detaching needs care here: Deno terminates the children it spawned when
  // the parent process exits, so `spawn` + `unref` is not enough — the server
  // comes up, answers /_health, and then dies with the CLI that started it.
  // The shell backgrounds the server and exits immediately, so the server is
  // orphaned (reparented to init) before Deno has any child left to kill.
  // setsid gives it its own session; the redirect puts its output in the log.
  const exe = Deno.execPath();
  const spawner = new Deno.Command("/bin/sh", {
    args: [
      "-c",
      `nohup setsid "${exe}" serve --host=${host} --port=${port} >> "${LOG_FILE}" 2>&1 & echo $!`,
    ],
    stdin: "null",
    stdout: "piped",
    stderr: "null",
  });
  const spawned = await spawner.output();
  const pid = Number(new TextDecoder().decode(spawned.stdout).trim()) || 0;

  await Deno.writeTextFile(PID_FILE, String(pid));

  if (!await waitFor(port, true)) {
    try {
      if (pid > 0) Deno.kill(pid, "SIGTERM");
    } catch { /* already gone */ }
    await removePid();
    die(EXIT.EXTERNAL, "daemon_unhealthy",
      `started pid ${pid} but /_health never answered on port ${port} (see ${LOG_FILE})`,
      `${TOOL} serve --port ${port}`);
  }

  emit({ ok: true, running: true, already_running: false, pid, port, log: LOG_FILE });
}

/// A no-op success when nothing is running: an agent stopping an
/// already-stopped daemon has got what it asked for (§4).
async function daemonStop(port: number): Promise<void> {
  if (!await probeHealth(port)) {
    await removePid();
    emit({ ok: true, running: false, stopped: false, port });
    return;
  }

  const headers: Record<string, string> = {};
  const token = Deno.env.get("SHUTDOWN_TOKEN");
  if (token) headers["X-Shutdown-Token"] = token;

  let status: number;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/_shutdown`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(2000),
    });
    status = res.status;
    await res.body?.cancel();
  } catch (e) {
    die(EXIT.EXTERNAL, "shutdown_failed",
      `POST /_shutdown failed: ${e instanceof Error ? e.message : String(e)}`,
      `${TOOL} daemon status --port ${port}`);
  }

  if (status !== 200) {
    die(EXIT.EXTERNAL, "shutdown_refused",
      `POST /_shutdown returned ${status}`,
      "set SHUTDOWN_TOKEN if the daemon is bound off-loopback");
  }

  await waitFor(port, false);
  await removePid();
  emit({ ok: true, running: false, stopped: true, port });
}

/// Status only ever reads — it never carries the shutdown token (§4).
async function daemonStatus(port: number): Promise<void> {
  if (!await probeHealth(port)) {
    emit({ ok: true, running: false, port });
    return;
  }
  let pid = 0;
  try {
    pid = Number((await Deno.readTextFile(PID_FILE)).trim()) || 0;
  } catch { /* no pid file */ }
  emit({ ok: true, running: true, pid, port, log: LOG_FILE });
}

// ─── App commands ───────────────────────────────────────────────

async function cmdDashboard(): Promise<void> {
  const config = await loadConfig();
  emit({
    ok: true,
    setting: config.setting || "Not configured",
    speedPreset: config.speedPreset,
    runtime: "deno",
    version: VERSION,
  });
}

async function cmdProcess(args: string[]): Promise<void> {
  const setting = flagValue(args, "--setting") ?? "";
  const speed = flagValue(args, "--speed") ?? "normal";

  if (!setting) {
    die(EXIT.MISSING_ARG, "missing_argument",
      "--setting is required",
      `${TOOL} process --setting my-value`);
  }

  const preset = SPEED_PRESETS[speed as keyof typeof SPEED_PRESETS] ?? SPEED_PRESETS.normal;
  const totalSteps = 100;

  for (let current = 0; current <= totalSteps; current += preset.batchSize) {
    // Progress is context: stderr, so an agent reading stdout sees only the
    // result (§1).
    const percentage = Math.min(Math.round((current / totalSteps) * 100), 100);
    console.error(`Processing: ${percentage}%`);
    if (preset.sleepBetweenOps > 0) await sleep(preset.sleepBetweenOps);
  }

  emit({ ok: true, setting, speed, totalSteps });
}

/// Help is context, not the answer to a query, so it goes to stderr (§1).
function printHelp(): void {
  console.error(`${TOOL} - Deno CLI with an embedded web UI

Usage:
  ${TOOL} <command> [options]

Commands:
  serve [--host H] [--port N]   run the HTTP server in the foreground
  daemon start [--port N]       start it in the background
  daemon stop [--port N]        stop the background server
  daemon status [--port N]      report background server status
  dashboard                     current configuration as JSON
  process --setting S           run the sample process
  guide [--human]               the embedded operator guide
  help-json                     machine-readable command catalog
  version [--json]              show version information
  help                          show this help message

Endpoints:
  GET  /            Web UI
  GET  /api/status  Server status (JSON)
  GET  /_health     Liveness: {ok,service,pid}
  POST /_shutdown   Stop the server (token-gated off-loopback)

Exit codes: 0 ok, 80-89 input, 90-99 state, 100-109 external, 110-119 internal`);
}

// ─── Main ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = Deno.args;

  if (args.length === 0) {
    // There is deliberately no interactive fallback: an agent cannot answer a
    // prompt, so every invocation must run to completion or fail (§6).
    printHelp();
    Deno.exit(EXIT.MISSING_ARG);
  }

  const cmd = args[0];
  const rest = args.slice(1);

  switch (cmd) {
    case "help":
    case "--help":
    case "-h":
      printHelp();
      return;

    case "version":
      if (hasFlag(rest, "--json")) {
        emit({ version: VERSION, name: TOOL });
      } else {
        console.log(`${TOOL} v${VERSION}`);
      }
      return;

    case "guide":
      console.log(hasFlag(rest, "--human") ? guideMarkdown() : guideJSON());
      return;

    case "help-json":
      console.log(helpJSON());
      return;

    case "serve":
      serveHttp(resolveHost(rest), resolvePort(rest));
      return;

    case "daemon": {
      if (rest.length === 0) {
        die(EXIT.MISSING_ARG, "missing_argument",
          "daemon needs a subcommand: start, stop or status",
          `${TOOL} daemon status`);
      }
      const sub = rest[0];
      const tail = rest.slice(1);
      const port = resolvePort(tail);

      if (sub === "start") await daemonStart(resolveHost(tail), port);
      else if (sub === "stop") await daemonStop(port);
      else if (sub === "status") await daemonStatus(port);
      else {
        die(EXIT.INVALID_ARGUMENT, "unknown_command",
          `unknown daemon subcommand "${sub}"`,
          `${TOOL} daemon status`);
      }
      return;
    }

    case "dashboard":
      await cmdDashboard();
      return;

    case "process":
      await cmdProcess(rest);
      return;

    // Back-compat aliases for the pre-spec entry points.
    case "--ui":
    case "-u":
      serveHttp(resolveHost(rest), resolvePort(rest));
      return;
    case "stop":
      await daemonStop(resolvePort(rest));
      return;
    case "status":
      await daemonStatus(resolvePort(rest));
      return;

    default:
      die(EXIT.INVALID_ARGUMENT, "unknown_command",
        `unknown command "${cmd}"`,
        `${TOOL} help-json`);
  }
}

main();
