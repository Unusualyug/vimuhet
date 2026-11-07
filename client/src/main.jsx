import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/500.css';
import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './styles/index.css';

import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { UIProvider } from './context/UIContext.jsx';
import { ConsentProvider } from './context/ConsentContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { StoreProvider } from './context/StoreContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { AdminAuthProvider } from './context/AdminAuthContext.jsx';
import api, { setToken } from './services/api.js';

const root = createRoot(document.getElementById('root'));

function renderApp() {
  root.render(
    <StrictMode>
      <BrowserRouter>
        <ThemeProvider>
          <ConsentProvider>
            <UIProvider>
              <AuthProvider>
              <StoreProvider>
                <CartProvider>
                  <AdminAuthProvider>
                    <App />
                  </AdminAuthProvider>
                </CartProvider>
                </StoreProvider>
              </AuthProvider>
            </UIProvider>
          </ConsentProvider>
        </ThemeProvider>
      </BrowserRouter>
    </StrictMode>
  );
}

/**
 * The refresh cookie lives at /api/auth, so the app cannot know it is signed in
 * until it asks once. Doing that before the first render (and handing the new
 * access token straight to the stores via the `vimuhet:token-refreshed` event)
 * stops protected pages from flashing the signed-out state on reload.
 */
async function bootstrapSession() {
  // Nothing to restore without the refresh cookie (it is scoped to /api/auth so
  // JavaScript cannot read it — this marker is how we avoid a pointless 401).
  if (!sessionStorage.getItem('vimuhet_has_session')) {
    renderApp();
    return;
  }
  try {
    const res = await api.post('/auth/refresh');
    const data = res.data?.data;
    if (data?.accessToken) {
      setToken(data.accessToken, data.admin ? 'admin' : 'customer');
      window.dispatchEvent(
        new CustomEvent('vimuhet:token-refreshed', {
          detail: { scope: data.admin ? 'admin' : 'customer', payload: data },
        })
      );
    }
  } catch {
    /* No active session — render as a guest. */
  }
  renderApp();
}

bootstrapSession();
