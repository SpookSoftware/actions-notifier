import { watch } from "fs";
import { os } from "os";

const mainBrowser =
  os.hostname() === "Giskard" ? "Brave Browser" : "Google Chrome";

const EXTENSION_PATH = "./extension";

const watcher = watch(
  EXTENSION_PATH,
  { recursive: true },
  (_eventType, filename) => {
    console.log(`File ${filename} changed. Reloading.`);
    reloadExtension();
  }
);

// For this to work, you must have https://chromewebstore.google.com/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid?pli=1 installed
async function reloadExtension() {
  Bun.spawnSync([
    "osascript",
    "-e",
    `tell application "${mainBrowser}" to open location "http://reload.extensions"`,
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
