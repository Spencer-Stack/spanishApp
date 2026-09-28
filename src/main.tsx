import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { VocabularyProvider } from './state/VocabularyContext'
import { ToastProvider } from './state/ToastContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <VocabularyProvider>
        <App />
      </VocabularyProvider>
    </ToastProvider>
  </StrictMode>,
)
