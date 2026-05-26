import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import api from '../api'
import { format, isToday, isPast } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  Clock, BookOpen, Wrench, CheckCircle2, X, Pin, Settings as SettingsIcon, Trash2, Check,
  ListTodo, CalendarDays, Maximize2, Minimize2,
} from 'lucide-react'
import clsx from 'clsx'
import CalendarView from './CalendarView.jsx'
import CosmicBackground from '../components/CosmicBackground.jsx'

const PRIORITY_ICON = {
  high: Clock,
  medium: BookOpen,
  low: Wrench,
  none: CheckCircle2,
}

const URGENT_KEY = 'jihua_widget_urgent_hours'
const SHOW_DONE_KEY = 'jihua_widget_show_done'
const VIEW_KEY = 'jihua_widget_view'

function fmtClock(date) {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(date) {
  return format(date, 'M月d日 · EEEE', { locale: zhCN })
}

function timeBand(start, due) {
  if (start && due) {
    const s = new Date(start)
    const d = new Date(due)
    const sameDay =
      s.getFullYear() === d.getFullYear() &&
      s.getMonth() === d.getMonth() &&
      s.getDate() === d.getDate()
    return sameDay
      ? `${format(s, 'HH:mm')}-${format(d, 'HH:mm')}`
      : `${format(s, 'M/d HH:mm')} → ${format(d, 'M/d HH:mm')}`
  }
  if (due) return format(new Date(due), 'HH:mm')
  if (start) return format(new Date(start), 'HH:mm') + ' 起'
  return '随时'
}

function computeState(task, now, urgentHours) {
  if (task.completed) return 'done'
  const start = task.start_date ? new Date(task.start_date) : null
  const due = task.due_date ? new Date(task.due_date) : null

  if (due && isPast(due) && !isToday(due) && now > due) return 'overdue'
  if (due && now > due) return 'overdue'

  if (start && due && now >= start && now <= due) return 'active'
  if (!start && due) {
    const msToDue = due.getTime() - now.getTime()
    const hoursToDue = msToDue / 3600000
    if (hoursToDue <= 0) return 'overdue'
    if (hoursToDue <= urgentHours) return 'urgent'
    return 'pending'
  }
  if (start && !due && now >= start) return 'active'
  if (due) {
    const hoursToDue = (due.getTime() - now.getTime()) / 3600000
    if (hoursToDue <= urgentHours && hoursToDue > 0) return 'urgent'
  }
  return 'pending'
}

export default function Widget() {
  const { projects, loadProjects, toggleTask, deleteTask } = useStore()
  const [now, setNow] = useState(new Date())
  const [list, setList] = useState([])
  const [pinned, setPinned] = useState(false)
  const [adding, setAdding] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [urgentHours, setUrgentHours] = useState(() => {
    const v = localStorage.getItem(URGENT_KEY)
    return v ? Number(v) : 2
  })
  const [showDone, setShowDone] = useState(() => {
    const v = localStorage.getItem(SHOW_DONE_KEY)
    return v === null ? true : v === '1'
  })
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || 'list')
  const [isFullScreen, setIsFullScreen] = useState(false)

  useEffect(() => {
    if (window.jihua?.isFullScreen) {
      window.jihua.isFullScreen().then((v) => setIsFullScreen(!!v))
    }
    const off = window.jihua?.onFullScreenChange?.((v) => setIsFullScreen(!!v))
    const onWebFs = () => setIsFullScreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onWebFs)
    return () => {
      if (typeof off === 'function') off()
      document.removeEventListener('fullscreenchange', onWebFs)
    }
  }, [])

  const toggleFullScreen = async () => {
    if (window.jihua?.toggleFullScreen) {
      const next = await window.jihua.toggleFullScreen()
      setIsFullScreen(!!next)
      return
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await document.documentElement.requestFullscreen()
    }
  }

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view)
  }, [view])

  useEffect(() => {
    document.documentElement.classList.add('widget')
    document.body.classList.add('widget')
    return () => {
      document.documentElement.classList.remove('widget')
      document.body.classList.remove('widget')
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await api.get('/tasks', { params: { archived: false } })
      setList(data)
    }
    fetchAll()
    const id = setInterval(fetchAll, 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    localStorage.setItem(URGENT_KEY, String(urgentHours))
  }, [urgentHours])
  useEffect(() => {
    localStorage.setItem(SHOW_DONE_KEY, showDone ? '1' : '0')
  }, [showDone])

  const todayTasks = useMemo(() => {
    const inScope = list.filter((t) => {
      if (!t.due_date && !t.start_date) return !t.completed
      const start = t.start_date ? new Date(t.start_date) : null
      const due = t.due_date ? new Date(t.due_date) : null
      const todayHit = (start && isToday(start)) || (due && isToday(due))
      const overdueHit = !t.completed && due && isPast(due)
      const ongoingHit = start && due && start <= now && due >= now
      return todayHit || overdueHit || ongoingHit
    })
    if (!showDone) {
      return inScope.filter((t) => !t.completed)
    }
    inScope.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      const ad = a.due_date
        ? new Date(a.due_date).getTime()
        : a.start_date
        ? new Date(a.start_date).getTime()
        : Infinity
      const bd = b.due_date
        ? new Date(b.due_date).getTime()
        : b.start_date
        ? new Date(b.start_date).getTime()
        : Infinity
      return ad - bd
    })
    return inScope
  }, [list, showDone, now])

  const handleToggle = async (id) => {
    await toggleTask(id)
    setList((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, completed: !t.completed, completed_at: !t.completed ? new Date().toISOString() : null }
          : t
      )
    )
  }

  const handleDelete = async (id) => {
    await deleteTask(id)
    setList((prev) => prev.filter((t) => t.id !== id))
  }

  const handleAdd = (e) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      const due = new Date()
      due.setMinutes(due.getMinutes() + 30)
      api
        .post('/tasks', { title: inputValue.trim(), due_date: due.toISOString(), priority: 'none', tag_ids: [] })
        .then(({ data }) => setList((prev) => [data, ...prev]))
      setInputValue('')
      setAdding(false)
    } else if (e.key === 'Escape') {
      setAdding(false)
      setInputValue('')
    }
  }

  const togglePin = () => {
    const next = !pinned
    setPinned(next)
    if (window.jihua?.setAlwaysOnTop) window.jihua.setAlwaysOnTop(next)
  }

  return (
    <div className="h-screen w-full min-w-0 text-white font-sans relative overflow-hidden flex flex-col rounded-3xl">
      <CosmicBackground />

      <div className="absolute inset-0 rounded-3xl border border-white/10 pointer-events-none" />

      <header
        className="relative z-10 flex items-center justify-end px-3 pt-2 gap-1 min-w-0"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex-1" />
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
          <div className="flex items-center bg-white/5 border border-white/10 rounded-md p-0.5 mr-1">
            <button
              onClick={() => setView('list')}
              className={clsx(
                'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition',
                view === 'list' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              )}
              title="列表视图"
            >
              <ListTodo className="w-3 h-3" /> 列表
            </button>
            <button
              onClick={() => setView('calendar')}
              className={clsx(
                'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition',
                view === 'calendar' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              )}
              title="日历视图"
            >
              <CalendarDays className="w-3 h-3" /> 日历
            </button>
          </div>
          <button
            onClick={togglePin}
            className={clsx(
              'p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition',
              pinned && 'text-orange-300'
            )}
            title={pinned ? '取消置顶' : '置顶'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleFullScreen}
            className={clsx(
              'p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition',
              isFullScreen && 'text-sky-300'
            )}
            title={isFullScreen ? '退出全屏' : '全屏'}
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={clsx(
              'p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition',
              showSettings && 'text-white bg-white/10'
            )}
            title="设置"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => window.jihua?.close && window.jihua.close()}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="关闭"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div
        className={clsx(
          'relative z-10 px-4 sm:px-6 border-b border-white/5 transition-all',
          view === 'list' ? 'pt-2 pb-4' : 'pt-1 pb-2'
        )}
      >
        <div
          className={clsx(
            'font-extralight tracking-tight transition-all',
            view === 'list' ? 'text-5xl' : 'text-2xl'
          )}
        >
          {fmtClock(now)}
        </div>
        <div className="text-slate-400 text-xs mt-0.5 font-light tracking-wider">{fmtDate(now)}</div>
      </div>

      {showSettings && (
        <div className="relative z-10 mx-4 mt-3 p-3 bg-white/5 border border-white/10 rounded-xl space-y-3 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-300">截止前进入微光渗漏</span>
              <span className="text-orange-300 font-mono">{urgentHours} 小时</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="48"
              step="0.25"
              value={urgentHours}
              onChange={(e) => setUrgentHours(Number(e.target.value))}
              className="w-full accent-orange-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>15 分钟</span>
              <span>2 天</span>
            </div>
          </div>
          <label className="flex items-center justify-between text-slate-300 cursor-pointer">
            <span>显示已完成任务</span>
            <input
              type="checkbox"
              checked={showDone}
              onChange={(e) => setShowDone(e.target.checked)}
              className="accent-orange-400"
            />
          </label>
          <button
            onClick={() => (window.jihua?.openMain ? window.jihua.openMain() : window.open('/', '_blank'))}
            className="w-full text-slate-400 hover:text-white text-[11px] underline-offset-2 hover:underline transition"
          >
            在浏览器打开主界面 →
          </button>
        </div>
      )}

      {view === 'calendar' ? (
        <CalendarView
          urgentHours={urgentHours}
          list={list}
          setList={setList}
        />
      ) : (
        <>
          <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-4 flex flex-col gap-2 w-full min-w-0">
            {todayTasks.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                <CheckCircle2 className="w-6 h-6 text-slate-600" />
                <span>今日无安排</span>
              </div>
            )}

            {todayTasks.map((t) => {
              const state = computeState(t, now, urgentHours)
              const Icon = PRIORITY_ICON[t.priority] || CheckCircle2
              const project = projects.find((p) => p.id === t.project_id)
              const label = timeBand(t.start_date, t.due_date)

              if (state === 'done') {
                return (
                  <div
                    key={t.id}
                    className="group flex gap-4 p-3 rounded-xl opacity-30 hover:opacity-90 transition"
                  >
                    <div className="w-12 text-right text-sm font-mono mt-0.5">{label}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium line-through truncate">{t.title}</div>
                      <div className="text-xs mt-1 flex items-center gap-1 text-slate-400">
                        <CheckCircle2 size={12} /> 已完成
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="self-center p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
                      title="删除任务"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              }

              if (state === 'active') {
                return (
                  <div
                    key={t.id}
                    className="flex gap-4 p-3 rounded-xl border border-sky-300/40 hover:border-sky-300/70 transition relative overflow-hidden"
                    style={{
                      background: 'radial-gradient(ellipse at 20% 50%, rgba(96,165,250,0.25), rgba(96,165,250,0.06) 70%)',
                      boxShadow: '0 0 14px rgba(96,165,250,0.25), inset 0 0 12px rgba(199,210,254,0.08)',
                    }}
                  >
                    <div className="w-12 text-right text-sm font-mono text-sky-200 mt-0.5">{label}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(t.id)}
                          className="w-3.5 h-3.5 rounded-full border border-sky-300/60 hover:bg-sky-300/30 shrink-0 flex items-center justify-center"
                          title="完成"
                        >
                          <Check className="w-2.5 h-2.5 text-transparent hover:text-sky-200" />
                        </button>
                        <div className="text-sm font-medium text-white truncate celestial-text">{t.title}</div>
                      </div>
                      <div className="text-xs text-sky-200/90 mt-1 flex items-center gap-1">
                        <Icon size={12} /> 进行中{project ? ` · ${project.name}` : ''}
                      </div>
                    </div>
                  </div>
                )
              }

              if (state === 'overdue' || state === 'urgent') {
                return (
                  <div
                    key={t.id}
                    className="flex gap-4 p-3 rounded-xl transition-all duration-1000 ease-in-out relative overflow-hidden border border-rose-400/40"
                    style={{
                      background: 'radial-gradient(ellipse at 25% 50%, rgba(251,113,133,0.32), rgba(251,113,133,0.08) 70%)',
                      boxShadow: '0 0 18px rgba(251,113,133,0.35), inset 0 0 14px rgba(255,200,200,0.12)',
                    }}
                  >
                    <div className="absolute inset-0 rounded-xl shadow-[inset_4px_0_0_0_rgba(251,113,133,0.85)] animate-pulse pointer-events-none" />
                    <div className="w-12 text-right text-sm font-mono mt-0.5 text-rose-300 relative z-10">
                      {label}
                    </div>
                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(t.id)}
                          className="w-3.5 h-3.5 rounded-full border border-orange-300/60 hover:bg-orange-300/30 shrink-0 flex items-center justify-center"
                          title="完成"
                        >
                          <Check className="w-2.5 h-2.5 text-transparent hover:text-orange-200" />
                        </button>
                        <div className="text-sm font-medium text-orange-50 truncate">{t.title}</div>
                      </div>
                      <div className="text-xs mt-1 flex items-center gap-1 text-orange-300">
                        <Clock size={12} className="animate-pulse" />
                        {state === 'overdue' ? '已逾期' : `即将截止${project ? ` · ${project.name}` : ''}`}
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={t.id}
                  className="flex gap-4 p-3 rounded-xl opacity-70 hover:opacity-100 transition"
                >
                  <div className="w-12 text-right text-sm font-mono mt-0.5 text-slate-400">{label}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(t.id)}
                        className="w-3.5 h-3.5 rounded-full border border-slate-500 hover:border-slate-300 shrink-0 flex items-center justify-center"
                        title="完成"
                      >
                        <Check className="w-2.5 h-2.5 text-transparent hover:text-slate-300" />
                      </button>
                      <div className="text-sm font-medium text-slate-200 truncate">{t.title}</div>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Icon size={12} /> {project?.name || '待办'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div
            className="relative z-10 p-4 border-t border-white/5 min-h-[73px] flex items-center justify-center transition-all"
            style={{ WebkitAppRegion: 'no-drag' }}
          >
            {adding ? (
              <input
                type="text"
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleAdd}
                onBlur={() => { if (!inputValue) setAdding(false) }}
                placeholder="输入任务，回车确认 (Esc取消)"
                className="w-full bg-white/5 text-white placeholder-slate-500 rounded-xl px-4 py-3 outline-none border border-white/10 focus:border-white/30 focus:bg-white/10 transition-all font-light text-sm shadow-inner"
              />
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 border border-white/5 hover:border-white/10 flex items-center justify-center text-xl font-light text-slate-300 transition-all active:scale-90"
              >
                +
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
