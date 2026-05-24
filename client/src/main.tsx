import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { THEME } from './lib/themeColors'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <>
      <App />
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3200,
          style: {
            background: THEME.surface,
            color: THEME.textPrimary,
            border: `1px solid ${THEME.border}`,
          },
          success: {
            iconTheme: { primary: THEME.accent2, secondary: THEME.background },
          },
          error: {
            iconTheme: { primary: THEME.accent3, secondary: THEME.background },
          },
        }}
      />
    </>
  </StrictMode>,
)
