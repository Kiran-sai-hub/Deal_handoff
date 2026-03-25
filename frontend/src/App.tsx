import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { api } from './api'
import { NavBar } from './components/NavBar'
import Setup from './pages/Setup'
import Dashboard from './pages/Dashboard'
import DealDetail from './pages/DealDetail'
import Configuration from './pages/Configuration'
import LiveFeed from './pages/LiveFeed'

export default function App() {
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null)

  useEffect(() => {
    api.setupStatus().then(s => setSetupComplete(s.complete))
  }, [])

  if (setupComplete === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading…</div>
      </div>
    )
  }

  if (!setupComplete) {
    return (
      <BrowserRouter basename="/ui">
        <Routes>
          <Route path="*" element={<Setup onComplete={() => setSetupComplete(true)} />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter basename="/ui">
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/deal/:id" element={<DealDetail />} />
            <Route path="/config" element={<Configuration />} />
            <Route path="/live" element={<LiveFeed />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
