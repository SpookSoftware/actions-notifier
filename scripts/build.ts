import type { BuildConfig } from "bun";
import { rm } from "node:fs/promises";

(async () => {
  const outputDir = "./dist";

  await rm(outputDir, { recursive: true, force: true });

  const options: BuildConfig = {
    entrypoints: [
      "./src/addNotificationButton.ts",
      "./src/background.ts",
      "./src/popup.tsx",
      "./src/manage.tsx",
      "./src/onboarding.tsx",
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

  // Copy and flatten CSS files
  const cssGlob = new Bun.Glob("**/*.css");
  for (const filePath of cssGlob.scanSync("./src")) {
    const file = Bun.file(`./src/${filePath}`);
    // Extract the basename of the CSS file
    const basename = filePath.split("/").pop() || filePath;
    await Bun.write(`${outputDir}/${basename}`, file);
  }

  // Copy HTML files
  const htmlGlob = new Bun.Glob("**/*.html");
  for (const filePath of htmlGlob.scanSync("./src")) {
    const file = Bun.file(`./src/${filePath}`);
    await Bun.write(`${outputDir}/${filePath}`, file);
  }

  console.log("Build completed successfully");
})();
