import App from "./components/popup/Popup.svelte";

document.addEventListener("DOMContentLoaded", () => {
  // Create and mount the Svelte component
  new App({
    target: document.getElementById("app"),
  });
});
