import { mount } from "svelte";
import Onboarding from "./components/svelte/onboarding/OnboardingPage.svelte";

const root = document.getElementById("root")!;
mount(Onboarding, { target: root });
