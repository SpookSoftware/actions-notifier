import ManagePage from "./components/svelte/manage/ManagePage.svelte";
import { mount } from "svelte";

const root = document.getElementById("root")!;
mount(ManagePage, { target: root });
