import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");

setup("authenticate", async ({ page }) => {
  // Perform authentication steps. Replace these actions with your own.
  await page.goto("https://github.com/login");
  await page
    .getByLabel("Username or email address")
    .fill("spookbot@spook.software");
  await page.getByLabel("Password").fill("a@J5y@AA5k$bR@Q9");
  await page.getByRole("button", { name: "Sign in" }).first().click();
  // Wait until the page receives the cookies.
  //
  // Sometimes login flow sets cookies in the process of several redirects.
  // Wait for the final URL to ensure that the cookies are actually set.
  await page.waitForURL("https://github.com/");

  await page.context().storageState({ path: authFile });
});
