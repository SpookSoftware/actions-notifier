// index.ts
import { mount, unmount } from "svelte";
import App from "./Popup.svelte";

const root = document.getElementById("root")!;
const app = mount(App, { target: root });
