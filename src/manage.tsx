import React from 'react';
import { createRoot } from 'react-dom/client';
import ManagePage from './components/react/ManagePage';

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', () => {
  const root = createRoot(document.getElementById('root')!);
  root.render(<ManagePage />);
});