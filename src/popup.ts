import { mount } from "svelte";
import Popup from "./Popup.svelte";

const root = document.getElementById("root")!;
mount(Popup, { target: root });
