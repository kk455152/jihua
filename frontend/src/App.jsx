import { useEffect, useState } from 'react'
import { useAuth } from './store'
import Layout from './pages/Layout.jsx'

export default function App() {
  const token = useAuth((s) => s.token)
  const ensureLoggedIn = useAuth((s) => s.ensureLoggedIn)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      ensureLoggedIn().catch((err) => {
        setError(err.response?.data?.detail || err.message || '初始化失败')
      })
    }
  }, [token, ensureLoggedIn])

  if (!token) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        {error ? <span className="text-red-500">{error}</span> : '正在进入…'}
      </div>
    )
  }
  return <Layout />
}
