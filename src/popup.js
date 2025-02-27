import browser from 'webextension-polyfill';

document.addEventListener("DOMContentLoaded", async function () {
  try {
    const data = await browser.storage.sync.get("githubToken");
    if (data.githubToken) {
      document.getElementById("githubToken").value = data.githubToken;
    }
  } catch (error) {
    console.error("Error loading GitHub token:", error);
  }

  document.getElementById("tokenForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = document.getElementById("githubToken").value;
    try {
      await browser.storage.sync.set({ githubToken: token });
      console.debug("GitHub token saved.");
    } catch (error) {
      console.error("Error saving GitHub token:", error);
    }
  });
});
