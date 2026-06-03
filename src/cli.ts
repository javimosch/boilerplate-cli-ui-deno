#!/usr/bin/env -S deno run --allow-all

// ─── Types ──────────────────────────────────────────────────────
interface Config {
  setting: string;
  speedPreset: string;
  lastUpdated?: string;
}

interface CLIError {
  code: number;
  type: string;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
  suggestions: string[];
}

// ─── Exit Codes ─────────────────────────────────────────────────
const EXIT_CODES = {
  SUCCESS: 0,
  INVALID_ARGUMENT: 85,
  BAD_PERMISSIONS: 86,
  RESOURCE_NOT_FOUND: 92,
  CONNECTION_TIMEOUT: 105,
  INTERNAL_ERROR: 110,
} as const;

// ─── Speed Presets ──────────────────────────────────────────────
const SPEED_PRESETS = {
  turbo: { name: "🚀 Turbo", sleepBetweenOps: 0, batchSize: 500 },
  fast: { name: "⚡ Fast", sleepBetweenOps: 10, batchSize: 200 },
  normal: { name: "🐢 Normal", sleepBetweenOps: 50, batchSize: 100 },
  gentle: { name: "🌱 Gentle", sleepBetweenOps: 100, batchSize: 50 },
} as const;

// ─── Config Management ──────────────────────────────────────────
const CONFIG_FILE = ".cliui-config.json";

async function loadConfig(): Promise<Config> {
  try {
    const data = await Deno.readTextFile(CONFIG_FILE);
    return JSON.parse(data);
  } catch {
    return { setting: "", speedPreset: "normal" };
  }
}

async function saveConfig(config: Config): Promise<void> {
  config.lastUpdated = new Date().toISOString();
  await Deno.writeTextFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ─── Output Helpers ─────────────────────────────────────────────
function outputJSON(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

function outputError(error: CLIError): void {
  outputJSON({ error });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Web UI Launcher ────────────────────────────────────────────
async function launchWebUI(): Promise<void> {
  console.log("🚀 Launching Web UI...");
  
  const serverPath = new URL("./server.ts", import.meta.url).pathname;
  
  const cmd = new Deno.Command("deno", {
    args: ["run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", serverPath],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  
  const child = cmd.spawn();
  await child.status;
}

// ─── Commands ───────────────────────────────────────────────────
async function cmdHelp(): Promise<void> {
  outputJSON({
    name: "boilerplate-cli-ui-deno",
    version: "1.0.0",
    description: "Agent-first CLI + Web UI boilerplate for Deno",
    options: {
      "--help, -h": "Show this help message",
      "--ui, -u": "Launch web UI instead of CLI",
    },
  });
}

async function cmdDashboard(): Promise<void> {
  const config = await loadConfig();
  outputJSON({
    status: "ok",
    data: {
      setting: config.setting || "Not configured",
      speedPreset: config.speedPreset,
      runtime: "deno",
      version: "1.0.0",
    },
    timestamp: new Date().toISOString(),
  });
}

async function cmdProcess(setting: string, speed: string): Promise<void> {
  if (!setting) {
    outputError({
      code: EXIT_CODES.INVALID_ARGUMENT,
      type: "invalid_argument",
      message: "Setting is required",
      recoverable: true,
      suggestions: ["Provide a setting value"],
    });
    Deno.exit(EXIT_CODES.INVALID_ARGUMENT);
  }

  const preset = SPEED_PRESETS[speed as keyof typeof SPEED_PRESETS] || SPEED_PRESETS.normal;
  const totalSteps = 100;

  for (let current = 0; current <= totalSteps; current += preset.batchSize) {
    const percentage = Math.min(Math.round((current / totalSteps) * 100), 100);
    console.error(`Processing: ${percentage}%`);
    if (preset.sleepBetweenOps > 0) {
      await sleep(preset.sleepBetweenOps);
    }
  }

  outputJSON({
    status: "success",
    data: { setting, speed, totalSteps },
    timestamp: new Date().toISOString(),
  });
}

// ─── Interactive CLI ────────────────────────────────────────────
async function interactiveCLI(): Promise<void> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const config = await loadConfig();
  
  while (true) {
    console.clear();
    console.log("╔══════════════════════════════════════╗");
    console.log("║     🦕 Deno CLI+WebUI Boilerplate   ║");
    console.log("╚══════════════════════════════════════╝\n");
    
    console.log("📋 Options:");
    console.log("  1️⃣  Dashboard    - View status");
    console.log("  2️⃣  Configure    - Set a value");
    console.log("  3️⃣  Process      - Run process");
    console.log("  4️⃣  Web UI       - Launch web interface");
    console.log("  5️⃣  Exit\n");
    
    if (config.setting) {
      console.log(`⚙️  Setting: ${config.setting}`);
    }
    console.log(`⚡ Speed: ${config.speedPreset}\n`);
    
    // Read input from stdin
    const buf = new Uint8Array(1024);
    await Deno.stdout.write(encoder.encode("Select (1-5): "));
    const n = await Deno.stdin.read(buf);
    if (!n) break;
    
    const choice = decoder.decode(buf.subarray(0, n)).trim();
    
    switch (choice) {
      case "1":
        await cmdDashboard();
        break;
      case "2": {
        await Deno.stdout.write(encoder.encode("Enter setting: "));
        const buf2 = new Uint8Array(1024);
        const n2 = await Deno.stdin.read(buf2);
        if (n2) {
          const setting = decoder.decode(buf2.subarray(0, n2)).trim();
          if (setting) {
            config.setting = setting;
            await saveConfig(config);
            console.log("✅ Setting saved!");
          }
        }
        break;
      }
      case "3":
        if (!config.setting) {
          console.log("❌ Configure setting first!");
        } else {
          await cmdProcess(config.setting, config.speedPreset);
        }
        break;
      case "4":
        await launchWebUI();
        break;
      case "5":
        console.log("👋 Goodbye!");
        return;
      default:
        console.log("❌ Invalid option");
    }
    
    if (choice !== "4") {
      await Deno.stdout.write(encoder.encode("\nPress Enter to continue..."));
      const buf3 = new Uint8Array(1024);
      await Deno.stdin.read(buf3);
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────
async function main(): Promise<void> {
  const args = Deno.args;
  
  if (args.includes("--help") || args.includes("-h")) {
    await cmdHelp();
  } else if (args.includes("--ui") || args.includes("-u")) {
    await launchWebUI();
  } else if (args.includes("dashboard")) {
    await cmdDashboard();
  } else if (args.includes("process")) {
    const settingIdx = args.indexOf("--setting");
    const speedIdx = args.indexOf("--speed");
    const setting = settingIdx !== -1 ? args[settingIdx + 1] : "";
    const speed = speedIdx !== -1 ? args[speedIdx + 1] : "normal";
    await cmdProcess(setting || "", speed);
  } else {
    await interactiveCLI();
  }
}

main();
