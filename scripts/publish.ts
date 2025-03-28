import { existsSync } from "fs";
import { unlink } from "fs/promises";
import path from "path";
import archiver from "archiver";

const TEST_MODE = process.env.TEST_MODE === "true";

// Configuration
const EXTENSION_ID = process.env.EXTENSION_ID;
const CLIENT_ID = process.env.CHROME_CLIENT_ID;
const CLIENT_SECRET = process.env.CHROME_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.CHROME_REFRESH_TOKEN;

// Ensure all required environment variables are set
if (!EXTENSION_ID || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error(`
    Missing required environment variables:
    - EXTENSION_ID: ${EXTENSION_ID ? "✓" : "✗"}
    - CHROME_CLIENT_ID: ${CLIENT_ID ? "✓" : "✗"}
    - CHROME_CLIENT_SECRET: ${CLIENT_SECRET ? "✓" : "✗"}
    - CHROME_REFRESH_TOKEN: ${REFRESH_TOKEN ? "✓" : "✗"}
    
    Please set these environment variables before running this script.
  `);
  process.exit(1);
}

if (TEST_MODE) {
  console.log("🧪 TEST MODE ENABLED - Will upload but not publish");
}

async function getAccessToken() {
  console.log("Getting access token...");

  const response = await fetch("https://www.googleapis.com/oauth2/v4/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      refresh_token: REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to get access token:", data);
    throw new Error("Failed to get access token");
  }

  return data.access_token;
}

function buildExtension() {
  console.log("Building extension for production...");

  try {
    const result = Bun.spawnSync(["bun", "run", "build:production"]);

    if (!result.success) {
      console.error("Build output:", result.stderr.toString());
      throw new Error(`Build failed with exit code ${result.exitCode}`);
    }

    console.log("✅ Build completed successfully");
  } catch (error) {
    console.error("❌ Build failed:", error);
    throw error;
  }
}

async function zipExtension() {
  console.log("Creating zip file...");

  // Remove existing zip if it exists
  if (existsSync("dist.zip")) {
    await unlink("dist.zip");
  }

  return new Promise<void>((resolve, reject) => {
    try {
      // Use Node's fs for compatibility with archiver
      const fs = require("fs");
      const output = fs.createWriteStream("dist.zip");
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Maximum compression
      });

      // Set up event handlers
      output.on("close", () => {
        console.log(`✅ Zip created successfully (${archive.pointer()} bytes)`);
        resolve();
      });

      archive.on("error", (err) => {
        console.error("❌ Zip creation failed:", err);
        reject(err);
      });

      // Pipe archive data to the file
      archive.pipe(output);

      // Add the entire dist directory to the zip
      archive.directory("dist/", false);

      // Finalize the archive
      archive.finalize();
    } catch (error) {
      console.error("❌ Zip creation error:", error);
      reject(error);
    }
  });
}

async function uploadToWebStore(accessToken: string) {
  console.log("Uploading to Chrome Web Store...");

  const manifestPath = path.join("dist", "manifest.json");
  const manifestFile = Bun.file(manifestPath);
  const manifest = await manifestFile.json();
  const version = manifest.version;

  console.log(`Uploading version ${version}...`);

  // First, upload the zip file
  const zipFile = Bun.file("dist.zip");
  const form = new FormData();
  form.append("file", new Blob([await zipFile.arrayBuffer()]));

  const uploadResponse = await fetch(
    `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${EXTENSION_ID}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-goog-api-version": "2",
      },
      body: form,
    }
  );

  let uploadResult;
  try {
    uploadResult = await uploadResponse.json();
  } catch (e) {
    console.error("Failed to parse response as JSON", e);
    const text = await uploadResponse.text();
    console.error("Response text:", text);
    throw new Error("Failed to parse upload response");
  }

  if (!uploadResponse.ok) {
    console.error("❌ Upload failed:", uploadResult);
    throw new Error("Failed to upload extension");
  }

  console.log("✅ Upload successful:", uploadResult);
  return uploadResult;
}

async function publishToWebStore(accessToken: string) {
  console.log("Publishing to Chrome Web Store...");

  const publishResponse = await fetch(
    `https://www.googleapis.com/chromewebstore/v1.1/items/${EXTENSION_ID}/publish`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-goog-api-version": "2",
        "Content-Length": "0",
      },
    }
  );

  const publishResult = await publishResponse.json();

  if (!publishResponse.ok) {
    console.error("❌ Publish failed:", publishResult);
    throw new Error("Failed to publish extension");
  }

  console.log(
    "✅ Publish successful! The extension has been submitted for review."
  );
  console.log("Publish result:", publishResult);
  return publishResult;
}

// Function to check draft status
async function checkDraftStatus(accessToken: string) {
  console.log("Checking draft status...");

  const response = await fetch(
    `https://www.googleapis.com/chromewebstore/v1.1/items/${EXTENSION_ID}?projection=DRAFT`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-goog-api-version": "2",
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("❌ Failed to check draft status:", text);
    throw new Error("Failed to check draft status");
  }

  const result = await response.json();
  console.log("✅ Draft status:", result);

  // Extract the version information from the response if available
  if (result.crxVersion) {
    console.log(`Current draft version: ${result.crxVersion}`);
  }

  return result;
}

async function main() {
  try {
    console.log(
      `Starting Chrome Web Store ${
        TEST_MODE ? "test upload" : "publishing"
      } process...`
    );

    // Step 1: Build the extension
    buildExtension();

    // Step 2: Zip the extension
    await zipExtension();

    // Step 3: Get an access token
    const accessToken = await getAccessToken();
    console.log("✅ Got access token");

    // Step 4: Upload to Web Store
    await uploadToWebStore(accessToken);

    // Step 5: Check draft status after upload
    await checkDraftStatus(accessToken);

    // Step 6: Publish to Web Store (submit for review) - only if not in test mode
    if (!TEST_MODE) {
      await publishToWebStore(accessToken);
      console.log("🎉 All done! The extension has been submitted for review.");
    } else {
      console.log(
        "✅ Test completed successfully! The extension was uploaded but not submitted for review."
      );
      console.log(
        "✅ You can view the draft in the Chrome Web Store Developer Dashboard at https://chrome.google.com/webstore/devconsole/7b7da69b-86d1-45b4-957d-a3864630eb19/deghkmeogdmhafeaekcebnnpncnapkjb/edit/package."
      );
    }
  } catch (error) {
    console.error("❌ Process failed:", error);
    process.exit(1);
  }
}

main();
