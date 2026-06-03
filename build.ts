// Build script for creating standalone Deno binary
import { bundle } from "https://deno.land/x/emit/mod.ts";

const DIST_DIR = "./dist";
const WEBUI_DIR = "./interfaces/webui/public";

// Ensure dist directory exists
try {
  await Deno.stat(DIST_DIR);
} catch {
  await Deno.mkdir(DIST_DIR, { recursive: true });
}

// Read static files
console.log("📦 Reading static files...");
const indexHtml = await Deno.readTextFile(`${WEBUI_DIR}/index.html`);
const stylesCss = await Deno.readTextFile(`${WEBUI_DIR}/styles.css`);
const appJs = await Deno.readTextFile(`${WEBUI_DIR}/app.js`);

console.log(`   - index.html: ${(indexHtml.length / 1024).toFixed(1)}KB`);
console.log(`   - styles.css: ${(stylesCss.length / 1024).toFixed(1)}KB`);
console.log(`   - app.js: ${(appJs.length / 1024).toFixed(1)}KB`);

// Create combined entry with embedded static files
console.log("\n📝 Creating combined entry...");

const serverCode = await Deno.readTextFile("./src/server.ts");
let cliCode = await Deno.readTextFile("./src/cli.ts");

// Strip shebang if present
if (cliCode.startsWith("#!/")) {
  cliCode = cliCode.substring(cliCode.indexOf("\n") + 1);
}

// Replace placeholders in server code
const staticFilesJson: Record<string, string> = {
  "/index.html": indexHtml,
  "/styles.css": stylesCss,
  "/app.js": appJs,
};

const serverWithAssets = serverCode
  .replace('"PLACEHOLDER_INDEX"', JSON.stringify(staticFilesJson["/index.html"]))
  .replace('"PLACEHOLDER_CSS"', JSON.stringify(staticFilesJson["/styles.css"]))
  .replace('"PLACEHOLDER_APPJS"', JSON.stringify(staticFilesJson["/app.js"]));

// Create combined entry
const combinedEntry = `
// Combined CLI + WebUI standalone binary (Deno)
const args = Deno.args;
const hasUIFlag = args.includes("--ui") || args.includes("-u");
const hasHelpFlag = args.includes("--help") || args.includes("-h");

if (hasUIFlag) {
  // Run as web server
  ${serverWithAssets}
} else {
  // Run as CLI
  ${cliCode}
}
`;

// Write temp entry file
const tempEntry = "./src/_temp_combined.ts";
await Deno.writeTextFile(tempEntry, combinedEntry);

// Compile with Deno
console.log("\n📦 Compiling with Deno...");
const binaryPath = `${DIST_DIR}/boilerplate-cli-ui-deno`;

const cmd = new Deno.Command("deno", {
  args: [
    "compile",
    "--allow-net",
    "--allow-read",
    "--allow-write",
    "--allow-env",
    "--output",
    binaryPath,
    tempEntry,
  ],
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const status = await cmd.output();
if (!status.success) {
  console.error("❌ Compile failed");
  await Deno.remove(tempEntry);
  Deno.exit(1);
}

// Remove temp file
await Deno.remove(tempEntry);

// Final output
const fileInfo = await Deno.stat(binaryPath);
const sizeMB = (fileInfo.size / (1024 * 1024)).toFixed(1);

console.log(`\n✅ Build complete!`);
console.log(`   Output: ${binaryPath}`);
console.log(`   Size: ${sizeMB}MB`);
console.log(`\n🚀 Test with: ./dist/boilerplate-cli-ui-deno --help`);
console.log(`🌐 Run UI with: ./dist/boilerplate-cli-ui-deno --ui`);
