import { watch } from "fs";

const EXTENSION_PATH = "./";

const watcher = watch(
  EXTENSION_PATH,
  { recursive: true },
  (eventType, filename) => {
    console.log(`File ${filename} changed. Reloading.`);
    reloadExtension();
  }
);

async function reloadExtension() {
  Bun.spawn(["open", "-a", "Brave Browser", "http://reload.extensions/"]);
}

process.on("SIGINT", () => {
  // close watcher when Ctrl-C is pressed
  console.log("Closing watcher...");
  watcher.close();

  process.exit(0);
});
