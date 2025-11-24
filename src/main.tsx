import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/theme.css';
import { initI18n } from './i18n';

async function bootstrap() {
  const cfg = await window.api.getConfig();
  const initialLocale = cfg.locale || 'en';

  await initI18n(initialLocale);

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Suspense fallback={<div>Carregando…</div>}>
        <App />
      </Suspense>
    </React.StrictMode>,
  );
}

bootstrap();
