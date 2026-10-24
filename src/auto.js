import { createLingoPatch } from "./index.js";

function start() {
  const config = globalThis.LingoPatchConfig;
  if (!config) {
    console.error("LingoPatchConfig must be defined before loading LingoPatch auto mode.");
    return;
  }

  globalThis.lingoPatch = createLingoPatch(config);
}

if (globalThis.document?.readyState === "loading") {
  globalThis.document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
