import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../api'
import { useStore } from '../store'
import {
  startOfWeek, addDays, addWeeks, subWeeks,
  format, isSameDay, isToday as fnsIsToday, isWeekend,
  startOfDay, endOfDay,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, RotateCcw, Trash2, Check, Plus, X, Flag, Folder, CalendarDays } from 'lucide-react'
import clsx from 'clsx'

const PRIORITIES = [
  { v: 'high', label: '高', cls: 'text-rose-300' },
  { v: 'medium', label: '中', cls: 'text-amber-300' },
  { v: 'low', label: '低', cls: 'text-sky-300' },
  { v: 'none', label: '无', cls: 'text-slate-400' },
]

const TRACKED_FIELDS = ['title', 'description', 'priority', 'project_id', 'due_date', 'start_date']

function localInputToISO(val) {
  if (val === '' || val === null) return null
  if (val === undefined) return undefined
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) return undefined
  return val.length === 16 ? `${val}:00` : val
}

function isoToLocalInput(iso) {
  if (!iso) return ''
  try {
    return format(new Date(iso), "yyyy-MM-dd'T'HH:mm")
  } catch {
    return ''
  }
}

function diffPatch(prev, next) {
  const patch = {}
  for (const k of TRACKED_FIELDS) {
    if (prev[k] !== next[k]) patch[k] = next[k]
  }
  return patch
}

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const HOUR_HEIGHT = 44
const DAY_START_HOUR = 0
const DAY_END_HOUR = 24
const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i)
const TIMELINE_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT
const SNAP_MIN = 15
const TIME_GUTTER_WIDTH = 34
const CALENDAR_MIN_WIDTH = 560

// 星体风格：高优先级=红巨星暖红辉光，中=主序星琥珀辉光，低=蓝矮星冷蓝辉光，无=暗星灰光
const PRIORITY_BLOCK = {
  high:   { cls: 'celestial-high',   text: 'celestial-text text-orange-50',  dot: 'bg-rose-300' },
  medium: { cls: 'celestial-medium', text: 'celestial-text text-amber-50',   dot: 'bg-amber-300' },
  low:    { cls: 'celestial-low',    text: 'celestial-text text-sky-50',     dot: 'bg-sky-300' },
  none:   { cls: 'celestial-dim',    text: 'celestial-text text-slate-100',  dot: 'bg-slate-300' },
}

function buildWeekDays(cursor) {
  const start = startOfWeek(cursor, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
function addMinutes(d, m) { const x = new Date(d); x.setMinutes(x.getMinutes() + m); return x }
function fmtRange(start, end) {
  if (!start || !end) return ''
  return isSameDay(start, end)
    ? `${format(start, 'HH:mm')}-${format(end, 'HH:mm')}`
    : `${format(start, 'M/d HH:mm')} → ${format(end, 'M/d HH:mm')}`
}

// 与 TaskDetail 保持一致：发给后端的是 naive local time（不做 UTC 转换）
function toLocalISO(d) {
  return format(d, "yyyy-MM-dd'T'HH:mm:ss")
}

function blockGeometry(task, day) {
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)
  const start = task.start_date ? new Date(task.start_date) : task.due_date ? new Date(task.due_date) : null
  const end = task.due_date ? new Date(task.due_date) : task.start_date ? addMinutes(new Date(task.start_date), 60) : null
  if (!start || !end) return null
  if (end < dayStart || start > dayEnd) return null
  const visStart = start < dayStart ? dayStart : start
  const visEnd = end > dayEnd ? dayEnd : end
  const startMin = (visStart.getHours() * 60 + visStart.getMinutes()) - DAY_START_HOUR * 60
  const endMin = (visEnd.getHours() * 60 + visEnd.getMinutes()) - DAY_START_HOUR * 60
  const top = clamp(startMin / 60 * HOUR_HEIGHT, 0, TIMELINE_HEIGHT)
  const bottom = clamp(endMin / 60 * HOUR_HEIGHT, 0, TIMELINE_HEIGHT)
  let height = Math.max(bottom - top, 18)
  if (top + height > TIMELINE_HEIGHT) height = TIMELINE_HEIGHT - top
  return { top, height, originalStart: start, originalEnd: end }
}

// 重叠布局：把同一列内会重叠的任务分配到不同的水平 column
function layoutColumns(items) {
  const sorted = [...items].sort((a, b) => a.top - b.top || (b.height - a.height))
  const groups = []
  let current = []
  let currentEnd = -1
  for (const it of sorted) {
    if (it.top >= currentEnd) {
      if (current.length) groups.push(current)
      current = [it]
      currentEnd = it.top + it.height
    } else {
      current.push(it)
      currentEnd = Math.max(currentEnd, it.top + it.height)
    }
  }
  if (current.length) groups.push(current)

  const placed = []
  for (const group of groups) {
    const cols = []
    for (const it of group) {
      let placedHere = false
      for (let c = 0; c < cols.length; c++) {
        const last = cols[c][cols[c].length - 1]
        if (last.top + last.height <= it.top) {
          cols[c].push(it)
          it._col = c
          placedHere = true
          break
        }
      }
      if (!placedHere) {
        cols.push([it])
        it._col = cols.length - 1
      }
    }
    const total = cols.length
    for (const it of group) {
      it._cols = total
    }
    placed.push(...group)
  }
  return placed
}

export default function CalendarView({ urgentHours, list, setList }) {
  const { projects, toggleTask, deleteTask, updateTask, createTask } = useStore()
  const [cursor, setCursor] = useState(() => new Date())
  const [selectedTask, setSelectedTask] = useState(null)
  const [now, setNow] = useState(new Date())
  const [drag, setDrag] = useState(null) // { task, deltaX, deltaY, day, top }
  const [quickAdd, setQuickAdd] = useState(null) // { day, top, title }
  const [showAddDialog, setShowAddDialog] = useState(false)
  const scrollRef = useRef(null)
  const gridRef = useRef(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  // 首次进入滚到当前小时附近
  useEffect(() => {
    if (!scrollRef.current) return
    const hour = new Date().getHours()
    const target = clamp((hour - DAY_START_HOUR - 1) * HOUR_HEIGHT, 0, TIMELINE_HEIGHT)
    scrollRef.current.scrollTop = target
  }, [])

  const days = useMemo(() => buildWeekDays(cursor), [cursor])

  const goPrev = () => setCursor((c) => subWeeks(c, 1))
  const goNext = () => setCursor((c) => addWeeks(c, 1))
  const goToday = () => setCursor(new Date())

  const handleToggle = async (id) => {
    await toggleTask(id)
    setList((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
    setSelectedTask((s) => (s && s.id === id ? { ...s, completed: !s.completed } : s))
  }
  const handleDelete = async (id) => {
    await deleteTask(id)
    setList((prev) => prev.filter((t) => t.id !== id))
    setSelectedTask(null)
  }

  // 全天事件：start/due 是 00:00 的认作全天
  const allDayByCol = useMemo(() => {
    const m = days.map(() => [])
    for (const t of list) {
      const start = t.start_date ? new Date(t.start_date) : null
      const due = t.due_date ? new Date(t.due_date) : null
      const ref = due || start
      if (!ref) continue
      const hasTimeOfDay =
        (due && (due.getHours() !== 0 || due.getMinutes() !== 0)) ||
        (start && (start.getHours() !== 0 || start.getMinutes() !== 0))
      if (hasTimeOfDay) continue
      days.forEach((d, i) => {
        if (isSameDay(d, ref) || (start && due && d >= startOfDay(start) && d <= endOfDay(due))) {
          m[i].push(t)
        }
      })
    }
    return m
  }, [days, list])

  const blocksByCol = useMemo(() => {
    return days.map((day) => {
      const items = []
      for (const t of list) {
        const geom = blockGeometry(t, day)
        if (!geom) continue
        const start = t.start_date ? new Date(t.start_date) : null
        const due = t.due_date ? new Date(t.due_date) : null
        const hasTimeOfDay =
          (due && (due.getHours() !== 0 || due.getMinutes() !== 0)) ||
          (start && (start.getHours() !== 0 || start.getMinutes() !== 0))
        if (!hasTimeOfDay) continue
        items.push({ task: t, ...geom })
      }
      return layoutColumns(items)
    })
  }, [days, list])

  const nowOffsetTop = useMemo(() => {
    const h = now.getHours() + now.getMinutes() / 60
    if (h < DAY_START_HOUR || h > DAY_END_HOUR) return null
    return (h - DAY_START_HOUR) * HOUR_HEIGHT
  }, [now])

  const monthLabel = format(days[0], 'yyyy年M月', { locale: zhCN })

  const EDGE_PX = 6 // 上下边缘 resize 句柄高度
  const calendarGridStyle = { gridTemplateColumns: `${TIME_GUTTER_WIDTH}px repeat(7, minmax(64px, 1fr))` }

  // 通用 mousedown：根据 mode = move | resize-top | resize-bottom 处理
  const startInteraction = (e, task, mode) => {
    if (e.button !== 0) return // 仅左键触发拖拽
    e.stopPropagation()
    e.preventDefault()

    const startX = e.clientX
    const startY = e.clientY
    const origStart = task.start_date ? new Date(task.start_date) : null
    const origDue = task.due_date ? new Date(task.due_date) : null
    let didMove = false
    let preview = null
    let rafId = 0
    let pendingArgs = null

    const apply = () => {
      rafId = 0
      if (!pendingArgs) return
      const { dx, dy } = pendingArgs
      if (mode === 'move') {
        const colWidth = gridRef.current ? (gridRef.current.clientWidth - TIME_GUTTER_WIDTH) / 7 : 1
        const dayShift = Math.round(dx / colWidth)
        const minuteShift = Math.round(dy / HOUR_HEIGHT * 60 / SNAP_MIN) * SNAP_MIN
        const newStart = origStart ? addDays(addMinutes(origStart, minuteShift), dayShift) : null
        const newDue = origDue ? addDays(addMinutes(origDue, minuteShift), dayShift) : null
        preview = { mode, newStart, newDue }
        setDrag({
          taskId: task.id,
          mode,
          dx,
          dy,
          // 视觉跟随用：dayShift 折算到列宽，minuteShift 折算到 px
          translateX: dayShift * colWidth,
          translateY: (minuteShift / 60) * HOUR_HEIGHT,
          previewStart: newStart,
          previewDue: newDue,
        })
      } else if (mode === 'resize-bottom') {
        const minuteShift = Math.round(dy / HOUR_HEIGHT * 60 / SNAP_MIN) * SNAP_MIN
        let newDue = origDue ? addMinutes(origDue, minuteShift) : null
        if (origStart && newDue && newDue.getTime() - origStart.getTime() < SNAP_MIN * 60000) {
          newDue = addMinutes(origStart, SNAP_MIN)
        }
        preview = { mode, newStart: origStart, newDue }
        // 视觉用：高度增量 = 实际 newDue - origDue 折算的像素
        const deltaPx = newDue && origDue ? ((newDue.getTime() - origDue.getTime()) / 60000 / 60) * HOUR_HEIGHT : 0
        setDrag({ taskId: task.id, mode, dy, deltaHeight: deltaPx, previewDue: newDue })
      } else if (mode === 'resize-top') {
        const minuteShift = Math.round(dy / HOUR_HEIGHT * 60 / SNAP_MIN) * SNAP_MIN
        let newStart = origStart ? addMinutes(origStart, minuteShift) : null
        if (origDue && newStart && origDue.getTime() - newStart.getTime() < SNAP_MIN * 60000) {
          newStart = addMinutes(origDue, -SNAP_MIN)
        }
        preview = { mode, newStart, newDue: origDue }
        // 视觉用：top 增量（向下为正） + 高度反向变化
        const deltaPx = newStart && origStart ? ((newStart.getTime() - origStart.getTime()) / 60000 / 60) * HOUR_HEIGHT : 0
        setDrag({ taskId: task.id, mode, dy, deltaTop: deltaPx, previewStart: newStart })
      }
    }

    const onMove = (ev) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (Math.abs(dx) + Math.abs(dy) > 4) didMove = true
      if (!didMove) return
      pendingArgs = { dx, dy }
      if (!rafId) rafId = requestAnimationFrame(apply)
    }

    const onUp = async () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (rafId) cancelAnimationFrame(rafId)
      setDrag(null)
      if (!didMove || !preview) {
        return
      }
      const patch = {}
      if (preview.newStart && (!origStart || preview.newStart.getTime() !== origStart.getTime())) {
        patch.start_date = toLocalISO(preview.newStart)
      }
      if (preview.newDue && (!origDue || preview.newDue.getTime() !== origDue.getTime())) {
        patch.due_date = toLocalISO(preview.newDue)
      }
      if (Object.keys(patch).length === 0) return
      setList((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...patch } : t)))
      try {
        await updateTask(task.id, patch)
      } catch (err) {
        console.error('更新失败', err)
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // 点击空白时段 → 快速添加
  const onColumnDblClick = (e, day) => {
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    const minuteFromStart = Math.round(offsetY / HOUR_HEIGHT * 60 / SNAP_MIN) * SNAP_MIN
    setQuickAdd({ day, minute: clamp(minuteFromStart, 0, (DAY_END_HOUR - DAY_START_HOUR) * 60 - 30), title: '' })
  }

  const submitQuickAdd = async () => {
    if (!quickAdd || !quickAdd.title.trim()) {
      setQuickAdd(null)
      return
    }
    const startD = new Date(quickAdd.day)
    startD.setHours(DAY_START_HOUR, 0, 0, 0)
    startD.setMinutes(startD.getMinutes() + quickAdd.minute)
    const dueD = addMinutes(startD, 60)
    try {
      const data = await createTask({
        title: quickAdd.title.trim(),
        start_date: toLocalISO(startD),
        due_date: toLocalISO(dueD),
        priority: 'none',
        tag_ids: [],
      })
      setList((prev) => [data, ...prev])
    } catch (err) {
      console.error('创建任务失败', err)
    }
    setQuickAdd(null)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full relative">
      <div className="flex items-center justify-between px-3 pt-1 pb-2">
        <div className="text-base font-light tracking-wide">{monthLabel}</div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAddDialog(true)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="添加任务"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button onClick={goPrev} className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition" title="上一周">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={goToday} className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition" title="本周">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={goNext} className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition" title="下一周">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-x-auto overscroll-x-contain">
        <div className="h-full w-full flex flex-col" style={{ minWidth: CALENDAR_MIN_WIDTH }}>
      <div className="grid border-y border-white/5" style={calendarGridStyle}>
        <div />
        {days.map((d, i) => {
          const isTodayHit = fnsIsToday(d)
          return (
            <div
              key={d.toISOString()}
              className={clsx(
                'flex flex-col items-center py-1 text-[10px] border-l border-white/5',
                isWeekend(d) && 'text-slate-400'
              )}
            >
              <span className="text-slate-500">周{WEEK_LABELS[i]}</span>
              <span
                className={clsx(
                  'mt-0.5 w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-medium',
                  isTodayHit ? 'bg-blue-400/80 text-white' : 'text-slate-200'
                )}
              >
                {format(d, 'd')}
              </span>
            </div>
          )
        })}
      </div>

      {allDayByCol.some((c) => c.length > 0) && (
        <div className="grid border-b border-white/5 bg-white/[0.02]" style={calendarGridStyle}>
          <div className="text-[9px] text-slate-500 text-right pr-1 py-1">全天</div>
          {allDayByCol.map((items, i) => (
            <div key={i} className="border-l border-white/5 px-0.5 py-0.5 space-y-0.5 min-h-[20px]">
              {items.slice(0, 2).map((t) => {
                const sty = PRIORITY_BLOCK[t.priority] || PRIORITY_BLOCK.none
                return (
                  <div
                    key={t.id}
                    onContextMenu={(e) => { e.preventDefault(); setSelectedTask(t) }}
                    className={clsx(
                      'truncate text-[9px] leading-tight px-1 py-0.5 rounded',
                      sty.cls, sty.text,
                      t.completed && 'line-through opacity-60'
                    )}
                    title={`${t.title}（右键编辑）`}
                  >
                    {t.title}
                  </div>
                )
              })}
              {items.length > 2 && <div className="text-[9px] text-slate-500 px-1">+{items.length - 2}</div>}
            </div>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        <div ref={gridRef} className="grid relative" style={{ ...calendarGridStyle, height: TIMELINE_HEIGHT }}>
          <div className="relative">
            {HOURS.map((h, i) => {
              if (i === HOURS.length - 1) return null
              return (
                <div
                  key={h}
                  className="absolute right-1 text-[9px] font-mono text-slate-500 leading-none"
                  style={{ top: i * HOUR_HEIGHT + 4 }}
                >
                  {String(h).padStart(2, '0')}
                </div>
              )
            })}
          </div>

          {days.map((day, ci) => {
            const isTodayCol = fnsIsToday(day)
            return (
              <div
                key={day.toISOString()}
                className={clsx('relative border-l border-white/5', isTodayCol && 'bg-blue-400/[0.04]')}
                onDoubleClick={(e) => onColumnDblClick(e, day)}
                title="双击空白处快速添加任务"
              >
                {HOURS.map((h, i) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-white/5 pointer-events-none"
                    style={{ top: i * HOUR_HEIGHT }}
                  />
                ))}

                {isTodayCol && nowOffsetTop !== null && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none h-0"
                    style={{ top: nowOffsetTop }}
                  >
                    {/* 纵向光柱：从裂隙水平线向上下衰减，让"裂缝"有深度 */}
                    <div
                      className="absolute -left-px w-[2px] -top-5 h-10 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(to bottom, transparent 0%, rgba(199,210,254,0.55) 45%, rgba(255,255,255,0.95) 50%, rgba(199,210,254,0.55) 55%, transparent 100%)',
                        filter: 'blur(0.4px) drop-shadow(0 0 6px rgba(199,210,254,0.6))',
                      }}
                    />

                    {/* 起点斜光斑 ◤ — 用 clip-path 削成三角，嵌在裂缝起点 */}
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(199,210,254,0.6) 40%, transparent 70%)',
                        clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
                        filter: 'drop-shadow(0 0 4px rgba(199,210,254,0.8))',
                      }}
                    />

                    {/* 水平裂隙线 + shimmer 流光 */}
                    <div className="absolute left-3 right-0 top-1/2 -translate-y-1/2 overflow-hidden">
                      <div className="time-rift-line" />
                    </div>

                    {/* 时间徽章：等宽数字 + 银白色描边 + 暗黑深空底 */}
                    <div
                      className="absolute -left-[36px] top-1/2 -translate-y-1/2 px-[5px] py-[1px] rounded-[3px] z-30 time-rift-badge"
                      style={{
                        background: 'linear-gradient(180deg, rgba(15,15,25,0.92), rgba(5,5,15,0.92))',
                        border: '1px solid rgba(199,210,254,0.45)',
                        boxShadow:
                          '0 0 6px rgba(199,210,254,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(6px)',
                      }}
                    >
                      <span
                        className="text-[9px] font-medium whitespace-nowrap"
                        style={{
                          color: '#e0e7ff',
                          textShadow: '0 0 4px rgba(199,210,254,0.6)',
                        }}
                      >
                        {format(now, 'HH:mm')}
                      </span>
                    </div>
                  </div>
                )}

                {blocksByCol[ci].map(({ task, top, height, originalStart, originalEnd, _col, _cols }) => {
                  const sty = PRIORITY_BLOCK[task.priority] || PRIORITY_BLOCK.none
                  const isUrgent =
                    !task.completed &&
                    task.due_date &&
                    (new Date(task.due_date).getTime() - now.getTime()) / 3600000 <= urgentHours &&
                    (new Date(task.due_date).getTime() - now.getTime()) / 3600000 > 0
                  const colCount = _cols || 1
                  const colIndex = _col || 0
                  const widthPct = 100 / colCount
                  const leftPct = colIndex * widthPct
                  const isInteracting = drag && drag.taskId === task.id

                  // 实时跟随中间态
                  let liveTop = top
                  let liveHeight = height
                  let liveTransform
                  if (isInteracting) {
                    if (drag.mode === 'move') {
                      liveTransform = `translate(${drag.translateX || 0}px, ${drag.translateY || 0}px)`
                    } else if (drag.mode === 'resize-top') {
                      const dt = drag.deltaTop || 0
                      liveTop = top + dt
                      liveHeight = Math.max(SNAP_MIN / 60 * HOUR_HEIGHT, height - dt)
                    } else if (drag.mode === 'resize-bottom') {
                      const dh = drag.deltaHeight || 0
                      liveHeight = Math.max(SNAP_MIN / 60 * HOUR_HEIGHT, height + dh)
                    }
                  }

                  // 拖动中的预览时间范围（覆盖原显示）
                  let displayStart = originalStart
                  let displayEnd = originalEnd
                  if (isInteracting) {
                    if (drag.previewStart) displayStart = drag.previewStart
                    if (drag.previewDue) displayEnd = drag.previewDue
                  }

                  return (
                    <div
                      key={`${task.id}-${day.toISOString()}`}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedTask(task) }}
                      className={clsx(
                        'absolute rounded overflow-hidden group',
                        sty.cls, sty.text,
                        !isInteracting && 'transition-[top,height,transform] duration-150 ease-out',
                        task.completed && 'line-through opacity-60',
                        isUrgent && 'ring-1 ring-orange-300/60 animate-pulse',
                        isInteracting && 'z-30 ring-1 ring-white/60 shadow-[0_8px_28px_rgba(0,0,0,0.5)] opacity-95'
                      )}
                      style={{
                        top: liveTop,
                        height: liveHeight,
                        left: `calc(${leftPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                        transform: liveTransform,
                        willChange: isInteracting ? 'transform, top, height' : undefined,
                      }}
                      title={`${task.title}\n${fmtRange(displayStart, displayEnd)}（右键编辑）`}
                    >
                      {/* 顶部 resize 句柄 */}
                      <div
                        onMouseDown={(e) => startInteraction(e, task, 'resize-top')}
                        className="absolute top-0 left-0 right-0 cursor-ns-resize z-10"
                        style={{ height: EDGE_PX }}
                        title="拖动调整开始时间"
                      >
                        <div className="opacity-0 group-hover:opacity-100 mx-auto mt-0.5 w-6 h-0.5 rounded-full bg-white/50 transition-opacity" />
                      </div>
                      {/* 中间内容区：move handle */}
                      <div
                        onMouseDown={(e) => startInteraction(e, task, 'move')}
                        className="absolute left-0 right-0 cursor-grab active:cursor-grabbing px-1 py-0.5"
                        style={{ top: EDGE_PX, bottom: EDGE_PX }}
                      >
                        <div className="text-[10px] leading-tight font-medium truncate">{task.title}</div>
                        {liveHeight > 28 && (
                          <div className="text-[9px] opacity-90 mt-0.5 truncate">
                            {format(displayStart, 'HH:mm')}-{format(displayEnd, 'HH:mm')}
                          </div>
                        )}
                      </div>
                      {/* 底部 resize 句柄 */}
                      <div
                        onMouseDown={(e) => startInteraction(e, task, 'resize-bottom')}
                        className="absolute bottom-0 left-0 right-0 cursor-ns-resize z-10"
                        style={{ height: EDGE_PX }}
                        title="拖动调整截止时间"
                      >
                        <div className="opacity-0 group-hover:opacity-100 mx-auto mb-0.5 w-6 h-0.5 rounded-full bg-white/50 transition-opacity" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
        </div>
      </div>

      {quickAdd && (
        <QuickAddPopover
          quickAdd={quickAdd}
          setQuickAdd={setQuickAdd}
          onSubmit={submitQuickAdd}
        />
      )}

      {showAddDialog && (
        <AddTaskDialog
          defaultDay={new Date()}
          projects={projects}
          onClose={() => setShowAddDialog(false)}
          onCreate={async (payload) => {
            try {
              const data = await createTask(payload)
              setList((prev) => [data, ...prev])
            } catch (err) { console.error(err) }
            setShowAddDialog(false)
          }}
        />
      )}

      {selectedTask && (
        <TaskPopover
          task={selectedTask}
          projects={projects}
          updateTask={updateTask}
          setList={setList}
          setSelectedTask={setSelectedTask}
          onClose={() => setSelectedTask(null)}
          onToggle={() => handleToggle(selectedTask.id)}
          onDelete={() => handleDelete(selectedTask.id)}
        />
      )}
    </div>
  )
}

function QuickAddPopover({ quickAdd, setQuickAdd, onSubmit }) {
  const startTime = (() => {
    const d = new Date(quickAdd.day)
    d.setHours(DAY_START_HOUR, 0, 0, 0)
    d.setMinutes(d.getMinutes() + quickAdd.minute)
    return d
  })()
  return (
    <div
      className="absolute left-2 right-2 bottom-2 z-30 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl p-3 sm:left-auto sm:w-[420px] sm:max-w-[calc(100%-1rem)]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-[11px] text-slate-400 mb-1.5">
        新建于 {format(startTime, 'M月d日 HH:mm', { locale: zhCN })}
      </div>
      <input
        autoFocus
        value={quickAdd.title}
        onChange={(e) => setQuickAdd({ ...quickAdd, title: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit()
          if (e.key === 'Escape') setQuickAdd(null)
        }}
        placeholder="任务标题，回车确认 (Esc 取消)"
        className="w-full bg-white/5 text-white placeholder-slate-500 rounded px-2 py-1.5 outline-none border border-white/10 focus:border-white/30 text-xs"
      />
    </div>
  )
}

function AddTaskDialog({ defaultDay, projects, onClose, onCreate }) {
  const init = (() => {
    const d = new Date(defaultDay)
    d.setMinutes(0, 0, 0)
    if (d.getHours() < DAY_START_HOUR) d.setHours(DAY_START_HOUR)
    return format(d, "yyyy-MM-dd'T'HH:mm")
  })()
  const [title, setTitle] = useState('')
  const [start, setStart] = useState(init)
  const [due, setDue] = useState(() => {
    const d = new Date(defaultDay)
    d.setMinutes(0, 0, 0)
    d.setHours((d.getHours() < DAY_START_HOUR ? DAY_START_HOUR : d.getHours()) + 1)
    return format(d, "yyyy-MM-dd'T'HH:mm")
  })
  const [priority, setPriority] = useState('none')
  const [projectId, setProjectId] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    onCreate({
      title: title.trim(),
      start_date: start ? `${start}:00` : null,
      due_date: due ? `${due}:00` : null,
      priority,
      project_id: projectId ? Number(projectId) : null,
      tag_ids: [],
    })
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-[90%] max-w-sm rounded-2xl bg-slate-900/98 border border-white/10 shadow-2xl p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">新建任务</span>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="任务标题"
          className="w-full bg-white/5 text-white placeholder-slate-500 rounded px-2 py-2 outline-none border border-white/10 focus:border-white/30 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">开始时间</label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full bg-white/5 text-white rounded px-2 py-1.5 outline-none border border-white/10 focus:border-white/30 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">截止时间</label>
            <input
              type="datetime-local"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="w-full bg-white/5 text-white rounded px-2 py-1.5 outline-none border border-white/10 focus:border-white/30 text-xs"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">优先级</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-white/5 text-white rounded px-2 py-1.5 outline-none border border-white/10 text-xs"
            >
              <option value="none">无</option>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">清单</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-white/5 text-white rounded px-2 py-1.5 outline-none border border-white/10 text-xs"
            >
              <option value="">未分类</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs rounded text-slate-300 hover:bg-white/5">取消</button>
          <button type="submit" className="px-3 py-1.5 text-xs rounded bg-blue-500/80 hover:bg-blue-500 text-white">创建</button>
        </div>
      </form>
    </div>
  )
}

function TaskPopover({ task, projects, updateTask, setList, setSelectedTask, onClose, onToggle, onDelete }) {
  const [draft, setDraft] = useState(task)
  const lastSavedRef = useRef(task)
  const saveTimerRef = useRef(null)

  // task 切换或远端更新时合并最新字段，但保留正在编辑的 tracked fields
  useEffect(() => {
    setDraft((prev) => {
      if (!prev || prev.id !== task.id) {
        lastSavedRef.current = task
        return task
      }
      const merged = { ...task }
      for (const k of TRACKED_FIELDS) merged[k] = prev[k]
      lastSavedRef.current = task
      return merged
    })
  }, [task])

  // debounced 自动保存
  useEffect(() => {
    if (!draft || !lastSavedRef.current) return
    const patch = diffPatch(lastSavedRef.current, draft)
    if (Object.keys(patch).length === 0) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await updateTask(draft.id, patch)
        lastSavedRef.current = { ...lastSavedRef.current, ...patch }
        setList((prev) => prev.map((t) => (t.id === draft.id ? { ...t, ...patch } : t)))
        setSelectedTask((s) => (s && s.id === draft.id ? { ...s, ...patch } : s))
      } catch (err) {
        console.error('保存失败', err)
      }
    }, 400)
    return () => saveTimerRef.current && clearTimeout(saveTimerRef.current)
  }, [draft, updateTask, setList, setSelectedTask])

  const update = (patch) => setDraft((d) => ({ ...d, ...patch }))

  const setStartDate = (val) => {
    const iso = localInputToISO(val)
    if (iso === undefined) return
    update({ start_date: iso })
  }
  const setDueDate = (val) => {
    const iso = localInputToISO(val)
    if (iso === undefined) return
    update({ due_date: iso })
  }

  const sty = PRIORITY_BLOCK[draft.priority] || PRIORITY_BLOCK.none
  const project = projects.find((p) => p.id === draft.project_id)

  return (
    <div
      className="absolute left-2 right-2 bottom-2 z-30 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl p-3 sm:left-auto sm:w-[360px] sm:max-w-[calc(100%-1rem)] max-h-[80%] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={onToggle}
          className={clsx(
            'mt-0.5 w-4 h-4 rounded-full border shrink-0 flex items-center justify-center',
            draft.completed ? 'bg-slate-400/40 border-slate-300/40' : 'border-slate-400/60 hover:border-white'
          )}
          title={draft.completed ? '取消完成' : '标记完成'}
        >
          {draft.completed && <Check className="w-2.5 h-2.5 text-white" />}
        </button>
        <textarea
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          rows={1}
          className={clsx(
            'flex-1 resize-none bg-transparent outline-none text-sm font-medium text-white placeholder-slate-500',
            draft.completed && 'line-through text-slate-400'
          )}
          placeholder="任务标题"
        />
        <button onClick={onClose} className="text-slate-500 hover:text-white shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5 flex-wrap">
        <span className={clsx('w-1.5 h-1.5 rounded-full', sty.dot)} />
        {project && (
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: project.color }} />
            {project.name}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2.5">
        <PopField icon={CalendarDays} label="开始时间">
          <div className="flex items-center gap-1.5">
            <input
              type="datetime-local"
              value={isoToLocalInput(draft.start_date)}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 bg-white/5 text-white rounded px-1.5 py-1 outline-none border border-white/10 focus:border-white/30 text-[11px]"
            />
            {draft.start_date && (
              <button onClick={() => update({ start_date: null })} className="text-[10px] text-slate-500 hover:text-rose-300 px-1">清除</button>
            )}
          </div>
        </PopField>

        <PopField icon={CalendarDays} label="截止时间">
          <div className="flex items-center gap-1.5">
            <input
              type="datetime-local"
              value={isoToLocalInput(draft.due_date)}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 bg-white/5 text-white rounded px-1.5 py-1 outline-none border border-white/10 focus:border-white/30 text-[11px]"
            />
            {draft.due_date && (
              <button onClick={() => update({ due_date: null })} className="text-[10px] text-slate-500 hover:text-rose-300 px-1">清除</button>
            )}
          </div>
        </PopField>

        <PopField icon={Flag} label="优先级">
          <div className="flex gap-1">
            {PRIORITIES.map((p) => (
              <button
                key={p.v}
                onClick={() => update({ priority: p.v })}
                className={clsx(
                  'px-2 py-0.5 rounded text-[11px] border transition-colors',
                  draft.priority === p.v
                    ? 'bg-white/10 border-white/30 text-white'
                    : 'border-white/10 text-slate-300 hover:bg-white/5'
                )}
              >
                <Flag className={clsx('w-3 h-3 inline mr-0.5', p.cls)} /> {p.label}
              </button>
            ))}
          </div>
        </PopField>

        <PopField icon={Folder} label="清单">
          <select
            value={draft.project_id || ''}
            onChange={(e) => update({ project_id: e.target.value ? Number(e.target.value) : null })}
            className="w-full bg-white/5 text-white rounded px-1.5 py-1 outline-none border border-white/10 focus:border-white/30 text-[11px]"
          >
            <option value="">未分类</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </PopField>

        <div>
          <div className="text-[10px] text-slate-400 mb-1">备注</div>
          <textarea
            value={draft.description || ''}
            onChange={(e) => update({ description: e.target.value })}
            rows={3}
            placeholder="补充任务详情…"
            className="w-full bg-white/5 text-white placeholder-slate-500 rounded px-1.5 py-1 outline-none border border-white/10 focus:border-white/30 text-[11px] resize-none"
          />
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-white/5 flex justify-end">
        <button onClick={onDelete} className="text-[11px] text-slate-400 hover:text-red-400 inline-flex items-center gap-1">
          <Trash2 className="w-3 h-3" /> 删除
        </button>
      </div>
    </div>
  )
}

function PopField({ icon: Icon, label, children }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
        <Icon className="w-3 h-3" /> {label}
      </div>
      {children}
    </div>
  )
}
