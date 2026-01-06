import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import FlexibleScrollDemo from './FlexibleScrollDemo.jsx'
import './index-clean.css'
import 'primeicons/primeicons.css';

const rootElement = document.getElementById('root');
createRoot(rootElement).render(
  <StrictMode>
    <FlexibleScrollDemo />
  </StrictMode>,
)
