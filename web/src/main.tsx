import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { IS_DEMO_MODE } from './api/client'

// GitHub Pages has no server-side rewrite support, so a direct link to e.g.
// /submissions/abc would 404 on refresh. HashRouter avoids that entirely by
// keeping routing client-side (#/submissions/abc).
const Router = IS_DEMO_MODE ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
)
