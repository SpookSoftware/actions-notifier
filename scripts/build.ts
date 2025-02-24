import type { BuildConfig } from "bun";
import { rm } from "node:fs/promises";

(async () => {
  await rm("./dist", { recursive: true, force: true });

  const options: BuildConfig = {
    entrypoints: [
      "./src/addNotificationButton.ts",
      "./src/background.ts",
      "./src/popup.html",
    ],
    outdir: "./dist",
    target: "browser",
  };

  if (Bun.argv.includes("--production")) {
    options.minify = true;
    options.drop = ["console"];
  }

  await Bun.build(options);

  const manifest = Bun.file("./src/manifest.json");
  await Bun.write("./dist/manifest.json", manifest);

  const imageGlob = new Bun.Glob("**/*.{png,jpg,jpeg,gif}");
  for (const filePath of imageGlob.scanSync("./src/images")) {
    const file = Bun.file(`./src/images/${filePath}`);
    await Bun.write(`./dist/images/${filePath}`, file);
  }
})();
