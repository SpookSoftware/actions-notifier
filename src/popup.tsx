import React from "react";
import { createRoot } from "react-dom/client";
import Popup from "./components/react/Popup";

// No need to import CSS here as it's linked in popup.html

// Wait for DOM to be loaded
document.addEventListener("DOMContentLoaded", () => {
  const root = createRoot(document.getElementById("root")!);
  root.render(<Popup />);
});