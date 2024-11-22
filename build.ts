import type { BuildConfig } from "bun";

(async () => {
  const options: BuildConfig = {
    entrypoints: ["./extension/addNotificationButton.ts"],
    outdir: "./extension/dist",
    target: "browser",
  };
  if (Bun.argv.includes("--production")) {
    options.minify = true;
    options.drop = ["console"];
  }
  await Bun.build(options);
})();
