import React from 'react';
import { createRoot } from 'react-dom/client';
import OnboardingPage from './components/react/OnboardingPage';

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', () => {
  const root = createRoot(document.getElementById('root')!);
  root.render(<OnboardingPage />);
});