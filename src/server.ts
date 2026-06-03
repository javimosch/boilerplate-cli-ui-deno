// ─── Embedded Static Files ──────────────────────────────────────
// These will be replaced at build time
const STATIC_FILES: Record<string, string> = {
  "/index.html": "PLACEHOLDER_INDEX",
  "/styles.css": "PLACEHOLDER_CSS",
  "/app.js": "PLACEHOLDER_APPJS",
};

// ─── MIME Types ─────────────────────────────────────────────────
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
};

// ─── Config Management ──────────────────────────────────────────
interface Config {
  setting: string;
  speedPreset: string;
}

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
  await Deno.writeTextFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ─── Server ─────────────────────────────────────────────────────
const PORT = parseInt(Deno.env.get("PORT") || "3000");

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // API Routes
  if (path === "/api/health") {
    return Response.json(
      { status: "ok", timestamp: new Date().toISOString() },
      { headers }
    );
  }

  if (path === "/api/config" && req.method === "GET") {
    const config = await loadConfig();
    return Response.json(config, { headers });
  }

  if (path === "/api/config" && req.method === "POST") {
    const config = await req.json();
    await saveConfig(config);
    return Response.json({ success: true, config }, { headers });
  }

  if (path === "/api/stats") {
    const config = await loadConfig();
    return Response.json(
      {
        setting: config.setting || "Not configured",
        speedPreset: config.speedPreset || "normal",
        runtime: "deno",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      },
      { headers }
    );
  }

  if (path === "/api/process" && req.method === "POST") {
    const { setting, speed } = await req.json();
    if (!setting) {
      return Response.json(
        { error: "Setting is required" },
        { status: 400, headers }
      );
    }

    const speedSettings: Record<string, { sleepBetweenOps: number; batchSize: number }> = {
      turbo: { sleepBetweenOps: 0, batchSize: 500 },
      fast: { sleepBetweenOps: 10, batchSize: 200 },
      normal: { sleepBetweenOps: 50, batchSize: 100 },
      gentle: { sleepBetweenOps: 100, batchSize: 50 },
    };
    const settings = speedSettings[speed] || speedSettings.normal;

    // Streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const totalSteps = 100;
        let current = 0;

        const processChunk = () => {
          if (current > totalSteps) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "complete",
                  result: { setting, totalSteps, duration: "2.50", speedSettings: speed, success: true },
                }) + "\n"
              )
            );
            controller.close();
            return;
          }

          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "progress",
                percentage: Math.min(Math.round((current / totalSteps) * 100), 100),
                message: `🔄 Processing: ${current}/${totalSteps}`,
              }) + "\n"
            )
          );

          current += settings.batchSize;
          setTimeout(processChunk, settings.sleepBetweenOps);
        };

        processChunk();
      },
    });

    return new Response(stream, {
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "Transfer-Encoding": "chunked",
      },
    });
  }

  // Static files
  if (STATIC_FILES[path]) {
    const ext = path.split(".").pop() || "";
    return new Response(STATIC_FILES[path], {
      headers: {
        ...headers,
        "Content-Type": MIME_TYPES[`.${ext}`] || "text/plain",
      },
    });
  }

  // Default to index.html
  return new Response(STATIC_FILES["/index.html"], {
    headers: {
      ...headers,
      "Content-Type": "text/html",
    },
  });
}

console.log(`🚀 CLI+WebUI Boilerplate (Deno) running on http://localhost:${PORT}`);
Deno.serve({ port: PORT }, handler);
