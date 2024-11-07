import CDP from "chrome-remote-interface";

import { watch } from "fs";

const EXTENSION_ID = "your-extension-id"; // We'll obtain this later
const EXTENSION_PATH = "./extension"; // Path to your extension directory

const watcher = watch(
  EXTENSION_PATH,
  { recursive: true },
  (eventType, filename) => {
		console.log("File changed. Reloading.")
		reloadExtension();
  }
);

async function reloadExtension() {
	const client = await CDP();
	const { Runtime } = client;

	// This command reloads the extension
	await Runtime.evaluate({
		expression: `chrome.runtime.reload()`,
		contextId: 0,
	});

	await client.close();
	console.log("Extension reloaded");
}

process.on("SIGINT", () => {
  // close watcher when Ctrl-C is pressed
  console.log("Closing watcher...");
  watcher.close();

  process.exit(0);
});