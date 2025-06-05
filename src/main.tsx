import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import DownloadManager from './components/DownloadManager.tsx'
import StatusCheck from './components/StatusCheck.tsx'
import DexieDemo from './components/DexieDemo.tsx'
import CameraCapture from './components/CameraCapture.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <App /> */}
    <>
    <h1>Hello</h1>
    {/* <DownloadManager />
     */}
    < StatusCheck />
    <DexieDemo/>
      {/* < StatusCheck /> */}
      <CameraCapture />
    </>
  </StrictMode>,
)
