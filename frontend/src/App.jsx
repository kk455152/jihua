import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store'
import Login from './pages/Login.jsx'
import Layout from './pages/Layout.jsx'

export default function App() {
  const token = useAuth((s) => s.token)
  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={token ? <Layout /> : <Navigate to="/login" replace />} />
    </Routes>
  )
}
