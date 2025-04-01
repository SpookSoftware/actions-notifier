/**
 * Version bump script for Actions Notifier
 *
 * Usage:
 *   bun run scripts/bump-version.ts [major|minor|patch] [--no-commit] [--no-tag]
 *
 * Examples:
 *   bun run scripts/bump-version.ts patch         # Bump patch version (0.95.0 -> 0.95.1)
 *   bun run scripts/bump-version.ts minor         # Bump minor version (0.95.0 -> 0.96.0)
 *   bun run scripts/bump-version.ts major         # Bump major version (0.95.0 -> 1.0.0)
 *   bun run scripts/bump-version.ts patch --no-commit  # Bump version but don't commit
 */

import { $ } from "bun";

const FILES_TO_UPDATE = ["./package.json", "./src/manifest.json"];

// Parse command line arguments
const args = Bun.argv.slice(2);
const versionType = args[0]?.toLowerCase();

if (!versionType || !["major", "minor", "patch"].includes(versionType)) {
  console.error(
    `❌ Please specify a valid version type: major, minor, or patch. You provided "${versionType}"`
  );
  process.exit(1);
}

// /**
//  * Bumps the version according to semantic versioning
//  */
function bumpVersion(
  version: string,
  type: "major" | "minor" | "patch"
): string {
  const [major, minor, patch] = version.split(".").map(Number);

  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      return version; // Should never happen due to earlier validation
  }
}

// /**
//  * Updates the version in a file
//  */
async function updateVersionInFile(
  filePath: string,
  newVersion: string
): Promise<void> {
  try {
    const content = await Bun.file(filePath).json();

    if (content.version) {
      content.version = newVersion;
      await Bun.write(filePath, JSON.stringify(content, null, 2));
      console.log(`✅ Updated ${filePath} to version ${newVersion}`);
    } else {
      console.warn(`⚠️ File ${filePath} doesn't have a 'version' field`);
    }
  } catch (error) {
    console.error(`❌ Failed to update version in ${filePath}:`, error);
    throw error;
  }
}

// /**
//  * Commits the version bump
//  */
async function commitVersionBump(version: string): Promise<void> {
  try {
    debugger;
    await $`git add ${FILES_TO_UPDATE}`;
    console.log("✅ Added files to git staging area");

    const authorName = "SpookBot";
    const authorEmail = "spookbot@spooksoftware.com";

    const commitMessage = `chore: bump version to ${version}`;
    await $`git -c user.name=${authorName} -c user.email=${authorEmail} commit -m ${commitMessage}`;
    console.log(
      `✅ Committed version bump with message: "${commitMessage}" as ${authorName} <${authorEmail}>`
    );
  } catch (error) {
    console.error("❌ Failed to commit version bump:", error);
    throw error;
  }
}

async function main() {
  try {
    const packageJson = await Bun.file("./package.json").json();
    const currentVersion = packageJson.version;
    const newVersion = bumpVersion(
      currentVersion,
      versionType as "major" | "minor" | "patch"
    );

    console.log(
      `🔄 Bumping version from ${currentVersion} to ${newVersion} (${versionType})`
    );

    // Update version in all files
    for (const file of FILES_TO_UPDATE) {
      await updateVersionInFile(file, newVersion);
    }

    await commitVersionBump(newVersion);
    console.log(
      `\n✨ Version bumped to ${newVersion} and committed successfully!`
    );
  } catch (error) {
    console.error("❌ Version bump failed:", error);
    process.exit(1);
  }
}

await main();
