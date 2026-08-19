import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PawQuestRoot from './PawQuestRoot'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PawQuestRoot />
  </StrictMode>,
)
