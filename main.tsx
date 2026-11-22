// main.tsx — Application entry point bundling local fonts, error boundary, and startup recovery

import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import './index.css';

const rootEl = document.getElementById('root');

if (!rootEl) {
  throw new Error('Root element #root not found in index.html.');
}

try {
  rootEl.dataset.mounted = '1';
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
} catch (err) {
  rootEl.dataset.mounted = '0';
  const msg = err instanceof Error ? err.message : String(err);
  const bootErr = (window as unknown as { __vijBootError?: (m: string) => void }).__vijBootError;
  if (bootErr) bootErr(msg);
  else rootEl.textContent = `Vij failed to start: ${msg}`;
}
