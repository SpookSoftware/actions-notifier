import ManagePage from './components/svelte/manage/ManagePage.svelte';

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', () => {
  const target = document.getElementById('root')!;
  new ManagePage({ target });
});