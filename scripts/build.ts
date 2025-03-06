import type { BuildConfig } from "bun";
import { rm } from "node:fs/promises";

(async () => {
  const browser = Bun.argv.includes("--firefox") ? "firefox" : "chrome";
  const outputDir = browser === "firefox" ? "./dist-firefox" : "./dist";

  await rm(outputDir, { recursive: true, force: true });

  const options: BuildConfig = {
    entrypoints: [
      "./src/addNotificationButton.ts",
      "./src/background.ts",
      "./src/popup.html",
      "./src/manage.html",
      "./src/onboarding.html",
      "./src/ExtPay_content_script.js",
    ],
    outdir: outputDir,
    target: "browser",
  };

  if (Bun.argv.includes("--production")) {
    options.minify = true;
    options.drop = ["console"];
  }

  await Bun.build(options);

  // Load the base manifest
  const manifestJson = await Bun.file("./src/manifest.json").json();

  // Firefox-specific adjustments
  if (browser === "firefox") {
    // Add Firefox-specific fields
    manifestJson.browser_specific_settings = {
      gecko: {
        id: "cicd-workflow-notifications@spooksoftware.com",
        strict_min_version: "109.0",
      },
    };

    // Firefox requires "scripts" instead of "service_worker" in background
    if (manifestJson.background && manifestJson.background.service_worker) {
      manifestJson.background = {
        scripts: [manifestJson.background.service_worker],
        type: "module",
      };
    }
  }

  // Write the appropriate manifest
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

  // Copy any CSS files (if you decide to separate CSS)
  const cssGlob = new Bun.Glob("**/*.css");
  for (const filePath of cssGlob.scanSync("./src")) {
    const file = Bun.file(`./src/${filePath}`);
    await Bun.write(`${outputDir}/${filePath}`, file);
  }

  console.log(`Build completed successfully for ${browser}`);
})();
