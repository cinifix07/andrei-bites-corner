import { StrictMode } from 'react'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

const convexUrl = import.meta.env.VITE_CONVEX_URL ?? 'https://fastidious-flamingo-123.convex.cloud'
const convex = new ConvexReactClient(convexUrl)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // The app still works online if service worker registration is unavailable.
    })
  })
}
