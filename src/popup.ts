// import React from "react";
// import { createRoot } from "react-dom/client";

// // No need to import CSS here as it's linked in popup.html

// // Wait for DOM to be loaded
// document.addEventListener("DOMContentLoaded", () => {
//   const root = createRoot(document.getElementById("root")!);
//   root.render(<Popup />);
// });

// index.ts
import { mount } from "svelte";
import Popup from "./Popup.svelte";

const root = document.getElementById("root")!;
const app = mount(Popup, { target: root });
