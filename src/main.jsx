import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ── Auth hash interceptor ─────────────────────────────────────────────────────
// When Supabase redirects to the root (or any non-callback path) with auth
// tokens in the hash (e.g. after email confirmation), the React Router wildcard
// route would fire <Navigate to="/login"> synchronously, clearing the hash
// before any useEffect can see it.  Rewrite the URL to /auth/callback first —
// before createRoot — so the router always renders AuthCallback for these tokens.
;(function interceptAuthHash() {
  const hash = window.location.hash
  if (!hash.includes('access_token=')) {
    if (window.location.search.includes('code=')) {
      console.warn('[auth] PKCE ?code= param in URL — unhandled flow, user may need to log in manually.')
    }
    return
  }
  const params = new URLSearchParams(hash.slice(1))
  const type   = params.get('type')
  const path   = window.location.pathname
  // Recovery tokens belong to /auth/set-password; already-intercepted URLs are left alone
  if (type === 'recovery' || path === '/auth/callback' || path === '/auth/set-password') return
  window.history.replaceState(null, '', '/auth/callback' + hash)
})()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
