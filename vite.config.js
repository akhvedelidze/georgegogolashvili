import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { generate } from "./scripts/generate.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const skip = new Set(["node_modules", "dist", "photos", "content", "src", "scripts", "public"]);

function htmlInputs(dir = root, acc = {}) {
  for (const name of readdirSync(dir)) {
    if (dir === root && skip.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) htmlInputs(full, acc);
    else if (name.endsWith(".html")) acc[full.replace(/[\\/:]/g, "_")] = full;
  }
  return acc;
}

export default defineConfig(async () => {
  await generate();
  return {
    base: "/",
    plugins: [
      {
        name: "editorial-content",
        configureServer(server) {
          server.watcher.add(path.join(root, "content"));
          server.watcher.on("change", async (file) => {
            if (!file.includes(`${path.sep}content${path.sep}`)) return;
            if (file.endsWith("image-manifest.csv")) return;
            await generate();
            server.ws.send({ type: "full-reload" });
          });
        },
      },
    ],
    build: {
      rollupOptions: {
        input: htmlInputs(),
      },
    },
  };
});
