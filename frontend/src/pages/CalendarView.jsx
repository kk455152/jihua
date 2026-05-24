import { useEffect, useMemo, useState } from 'react'
import api from '../api'
import { useStore } from '../store'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, format, isSameMonth, isSameDay,
  isToday as fnsIsToday, isWeekend, isPast,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, RotateCcw, Check, Trash2 } from 'lucide-react'
import clsx from 'clsx'

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']

function buildMonthGrid(monthDate) {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 })
  const days = []
  let cursor = start
  while (cursor <= end) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
  }
  while (days.length < 42) days.push(addDays(days[days.length - 1], 1))
  return days.slice(0, 42)
}

function priorityDotColor(priority) {
  return (
    {
      high: 'bg-orange-400',
      medium: 'bg-amber-300',
      low: 'bg-blue-300',
      none: 'bg-slate-400',
    }[priority] || 'bg-slate-400'
  )
}

function tasksOnDay(tasks, day) {
  return tasks.filter((t) => {
    const due = t.due_date ? new Date(t.due_date) : null
    const start = t.start_date ? new Date(t.start_date) : null
    if (start && due) {
      return start <= endOfDay(day) && due >= startOfDay(day)
    }
    if (due) return isSameDay(due, day)
    if (start) return isSameDay(start, day)
    return false
  })
}

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function endOfDay(d) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export default function CalendarView({ urgentHours }) {
  const { projects, toggleTask, deleteTask } = useStore()
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState(() => new Date())
  const [list, setList] = useState([])

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await api.get('/tasks', { params: { archived: false } })
      setList(data)
    }
    fetchAll()
    const id = setInterval(fetchAll, 30000)
    return () => clearInterval(id)
  }, [])

  const days = useMemo(() => buildMonthGrid(cursor), [cursor])

  const tasksBySelected = useMemo(() => {
    const sel = tasksOnDay(list, selected)
    sel.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity
      const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity
      return ad - bd
    })
    return sel
  }, [list, selected])

  const goPrev = () => setCursor((c) => subMonths(c, 1))
  const goNext = () => setCursor((c) => addMonths(c, 1))
  const goToday = () => {
    const t = new Date()
    setCursor(t)
    setSelected(t)
  }

  const handleToggle = async (id) => {
    await toggleTask(id)
    setList((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }

  const handleDelete = async (id) => {
    await deleteTask(id)
    setList((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain w-full max-w-md mx-auto">
      <div className="flex flex-col px-3 pt-1 pb-2 gap-2">
      <div className="flex items-center justify-between px-1">
        <div className="text-base font-light tracking-wide">
          {format(cursor, 'yyyy 年 M 月', { locale: zhCN })}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="上个月"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={goToday}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="今天"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={goNext}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="下个月"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-[10px] text-slate-500 px-0.5">
        {WEEK_LABELS.map((w, i) => (
          <div
            key={w}
            className={clsx('text-center py-0.5', (i === 5 || i === 6) && 'text-slate-400')}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const inMonth = isSameMonth(day, cursor)
          const isTodayHit = fnsIsToday(day)
          const isSelected = isSameDay(day, selected)
          const dayTasks = tasksOnDay(list, day)
          const hasUrgent = dayTasks.some((t) => {
            if (t.completed || !t.due_date) return false
            const due = new Date(t.due_date)
            const hours = (due.getTime() - Date.now()) / 3600000
            return (hours <= urgentHours && hours > 0) || (hours <= 0 && !t.completed)
          })
          const dotColors = Array.from(
            new Set(
              dayTasks
                .filter((t) => !t.completed)
                .slice(0, 3)
                .map((t) => priorityDotColor(t.priority))
            )
          )
          const allDone = dayTasks.length > 0 && dayTasks.every((t) => t.completed)

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelected(day)}
              className={clsx(
                'aspect-square relative flex flex-col items-center justify-start py-1 rounded-md transition-all',
                'hover:bg-white/5',
                !inMonth && 'opacity-30',
                isSelected && 'bg-white/10 ring-1 ring-white/20',
                hasUrgent && !isSelected && 'bg-orange-500/5'
              )}
            >
              <span
                className={clsx(
                  'text-[11px] font-medium leading-tight w-5 h-5 flex items-center justify-center rounded-full',
                  isTodayHit && 'bg-blue-400/80 text-white',
                  !isTodayHit && isWeekend(day) && 'text-slate-400',
                  !isTodayHit && !isWeekend(day) && 'text-slate-200',
                  allDone && !isTodayHit && 'line-through text-slate-500'
                )}
              >
                {format(day, 'd')}
              </span>
              {dotColors.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dotColors.map((c, i) => (
                    <span key={i} className={clsx('w-1 h-1 rounded-full', c)} />
                  ))}
                </div>
              )}
              {hasUrgent && (
                <span className="absolute inset-0 rounded-md shadow-[inset_2px_0_0_0_rgba(249,115,22,0.7)] animate-pulse pointer-events-none" />
              )}
            </button>
          )
        })}
      </div>

      <div className="border-t border-white/5 pt-2 flex flex-col">
        <div className="flex items-baseline justify-between px-1 mb-1.5">
          <div className="text-xs text-slate-300">
            {format(selected, 'M月d日 · EEEE', { locale: zhCN })}
            {fnsIsToday(selected) && <span className="ml-1.5 text-blue-300">今天</span>}
          </div>
          <span className="text-[10px] text-slate-500">{tasksBySelected.length} 项</span>
        </div>
        <div className="space-y-1 pr-0.5">
          {tasksBySelected.length === 0 && (
            <div className="text-center text-xs text-slate-500 py-6">这一天没有安排</div>
          )}
          {tasksBySelected.map((t) => {
            const project = projects.find((p) => p.id === t.project_id)
            const due = t.due_date ? new Date(t.due_date) : null
            const start = t.start_date ? new Date(t.start_date) : null
            const overdue = due && !t.completed && due < new Date()
            const timeLabel =
              start && due && isSameDay(start, due)
                ? `${format(start, 'HH:mm')}-${format(due, 'HH:mm')}`
                : due
                ? format(due, 'HH:mm')
                : start
                ? format(start, 'HH:mm') + ' 起'
                : '随时'
            return (
              <div
                key={t.id}
                className={clsx(
                  'group flex items-start gap-2 px-2 py-1.5 rounded-lg transition-all',
                  t.completed
                    ? 'opacity-40 hover:opacity-80'
                    : overdue
                    ? 'bg-orange-500/5 border border-orange-500/30'
                    : 'bg-white/5 hover:bg-white/10 border border-white/5'
                )}
              >
                <button
                  onClick={() => handleToggle(t.id)}
                  className={clsx(
                    'mt-1 w-3.5 h-3.5 rounded-full border shrink-0 flex items-center justify-center',
                    t.completed
                      ? 'bg-slate-400/40 border-slate-300/40'
                      : 'border-slate-400/60 hover:border-white'
                  )}
                  title={t.completed ? '取消完成' : '标记完成'}
                >
                  {t.completed && <Check className="w-2 h-2 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div
                    className={clsx(
                      'text-[12px] leading-tight truncate',
                      t.completed ? 'line-through text-slate-400' : overdue ? 'text-orange-50' : 'text-slate-100'
                    )}
                  >
                    {t.title}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className={clsx(overdue && 'text-orange-300')}>{timeLabel}</span>
                    {project && (
                      <span className="inline-flex items-center gap-0.5">
                        <span className="w-1 h-1 rounded-full" style={{ background: project.color }} />
                        {project.name}
                      </span>
                    )}
                    <span className={clsx('w-1 h-1 rounded-full', priorityDotColor(t.priority))} />
                  </div>
                </div>
                {t.completed && (
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="self-center p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
                    title="删除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
      </div>
    </div>
  )
}
