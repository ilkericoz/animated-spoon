import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import SwipePage from './pages/SwipePage.tsx'

const isSwipePage = window.location.pathname === '/swipe'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSwipePage ? <SwipePage /> : <App />}
  </StrictMode>,
)
