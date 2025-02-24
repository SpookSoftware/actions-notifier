import { watch } from "fs";

const EXTENSION_PATH = "./src";

const watcher = watch(
  EXTENSION_PATH,
  { recursive: true },
  (_eventType, filename) => {
    // Prevents infinite loop when the dist folder is updated. There is probably (definitely) a better way to do this.
    if (filename && !filename.startsWith("extension/")) {
      console.log(`File ${filename} changed. Reloading.`);
      reloadExtension();
    }
  }
);

// For this to work, you must have https://chromewebstore.google.com/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid?pli=1 installed
async function reloadExtension() {
  Bun.spawnSync(["bun", "run", "build"]);
  Bun.spawnSync([
    "osascript",
    "-e",
    `tell application "Brave Browser" to open location "http://reload.extensions"`,
  ]);
  Bun.spawnSync([
    "osascript",
    "-e",
    'tell application "Visual Studio Code" to activate',
  ]);
}

process.on("SIGINT", () => {
  // close watcher when Ctrl-C is pressed
  console.log("Closing watcher...");
  watcher.close();

  process.exit(0);
});

await reloadExtension();
