import { useState } from 'react'
import { useAuth } from '../store'
import { CheckCircle2 } from 'lucide-react'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') await login(username, password)
      else await register(username, password, email || null)
    } catch (err) {
      setError(err.response?.data?.detail || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-md card p-8">
        <div className="flex items-center gap-2 mb-6">
          <CheckCircle2 className="w-8 h-8 text-brand-500" />
          <h1 className="text-2xl font-semibold">计划 · Jihua</h1>
        </div>
        <p className="text-slate-500 text-sm mb-6">
          {mode === 'login' ? '欢迎回来，登录后开始规划你的一天' : '创建账号，开始你的高效之旅'}
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-500">用户名</label>
            <input className="input mt-1" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          {mode === 'register' && (
            <div>
              <label className="text-xs text-slate-500">邮箱（可选）</label>
              <input type="email" className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500">密码</label>
            <input type="password" className="input mt-1" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? '处理中…' : mode === 'login' ? '登录' : '注册并登录'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          {mode === 'login' ? '还没有账号？' : '已经有账号？'}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="ml-1 text-brand-500 hover:underline">
            {mode === 'login' ? '去注册' : '去登录'}
          </button>
        </p>
      </div>
    </div>
  )
}
