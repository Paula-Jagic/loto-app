// main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'; // 👈 UVEZITE OVO
import './App.css'
import App from './App.jsx'

// Definirajte svoje Auth0 varijable iz .env
const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 🛑 OMOTAJTE APLIKACIJU U AUTH0 PROVIDER */}
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin
      }}
    >
        <App />
    </Auth0Provider>
  </StrictMode>,
);