import type { BuildConfig } from "bun";
import { rm } from "node:fs/promises";
import { SveltePlugin } from "bun-plugin-svelte";

(async () => {
  const outputDir = "./dist";

  await rm(outputDir, { recursive: true, force: true });

  const options: BuildConfig = {
    entrypoints: [
      "./src/addNotificationButton.ts",
      "./src/background.ts",
      "./src/popup.html",
      "./src/manage.tsx",
      "./src/onboarding.tsx",
      "./src/ExtPay_content_script.js",
    ],
    outdir: outputDir,
    plugins: [
      SveltePlugin({
        development: true, // turn off for prod builds. Defaults to false
      }),
    ],
    target: "browser",
  };

  if (Bun.argv.includes("--production")) {
    options.minify = true;
    options.drop = ["console"];
  }

  await Bun.build(options);

  // Load the base manifest
  const manifestJson = await Bun.file("./src/manifest.json").json();

  // Write the manifest
  await Bun.write(
    `${outputDir}/manifest.json`,
    JSON.stringify(manifestJson, null, 2)
  );

  // Copy images
  const imageGlob = new Bun.Glob("**/*.{png,jpg,jpeg,gif,svg}");
  for (const filePath of imageGlob.scanSync("./src/images")) {
    const file = Bun.file(`./src/images/${filePath}`);
    await Bun.write(`${outputDir}/images/${filePath}`, file);
  }
  console.log("Build completed successfully");
})();
