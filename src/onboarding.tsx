import OnboardingPage from './components/svelte/onboarding/OnboardingPage.svelte';

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', () => {
  const target = document.getElementById('root')!;
  new OnboardingPage({ target });
});