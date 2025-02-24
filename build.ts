import type { BuildConfig } from "bun";

(async () => {
  const options: BuildConfig = {
    entrypoints: [
      "./src/addNotificationButton.ts",
      "./src/background.ts",
      "./src/popup.html",
    ],
    outdir: "./extension",
    target: "browser",
  };

  if (Bun.argv.includes("--production")) {
    options.minify = true;
    options.drop = ["console"];
  }

  await Bun.build(options);

  const manifest = Bun.file("./src/manifest.json");
  await Bun.write("./extension/manifest.json", manifest);

  const imageGlob = new Bun.Glob("**/*.{png,jpg,jpeg,gif,svg}");
  for (const filePath of imageGlob.scanSync("./src/images")) {
    const file = Bun.file(`./src/images/${filePath}`);
    await Bun.write(`./extension/images/${filePath}`, file);
  }
})();
