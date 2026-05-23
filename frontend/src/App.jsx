import { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useAuth } from './store'
import Layout from './pages/Layout.jsx'
import Widget from './pages/Widget.jsx'
import UiPrototype from './pages/UiPrototype.jsx'

const PUBLIC_PATHS = ['/ui']

export default function App() {
  const token = useAuth((s) => s.token)
  const ensureLoggedIn = useAuth((s) => s.ensureLoggedIn)
  const [error, setError] = useState('')
  const location = useLocation()
  const isPublic = PUBLIC_PATHS.includes(location.pathname)

  useEffect(() => {
    if (!token && !isPublic) {
      ensureLoggedIn().catch((err) => {
        setError(err.response?.data?.detail || err.message || '初始化失败')
      })
    }
  }, [token, isPublic, ensureLoggedIn])

  if (!token && !isPublic) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        {error ? <span className="text-red-500">{error}</span> : '正在进入…'}
      </div>
    )
  }
  return (
    <Routes>
      <Route path="/ui" element={<UiPrototype />} />
      <Route path="/widget" element={<Widget />} />
      <Route path="/*" element={<Layout />} />
    </Routes>
  )
}
