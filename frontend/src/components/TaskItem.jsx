import { useStore } from '../store'
import { format, isToday, isPast, isThisYear } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { CalendarDays, Flag, Hash } from 'lucide-react'
import clsx from 'clsx'

const PRIORITY_COLORS = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-blue-500',
  none: 'text-slate-300',
}

function fmtDate(d) {
  const date = new Date(d)
  if (isToday(date)) return `今天 ${format(date, 'HH:mm')}`
  if (isThisYear(date)) return format(date, 'M月d日 HH:mm', { locale: zhCN })
  return format(date, 'yyyy年M月d日', { locale: zhCN })
}

export default function TaskItem({ task }) {
  const { activeTask, setActiveTask, toggleTask } = useStore()
  const isActive = activeTask?.id === task.id

  const overdue = task.due_date && !task.completed && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))

  return (
    <div
      className={clsx(
        'group flex items-start gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors',
        isActive ? 'bg-brand-50' : 'hover:bg-slate-100'
      )}
      onClick={() => setActiveTask(task)}
    >
      <button
        onClick={(e) => { e.stopPropagation(); toggleTask(task.id) }}
        className={clsx(
          'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
          task.completed
            ? 'bg-brand-500 border-brand-500'
            : task.priority === 'high' ? 'border-red-400 hover:bg-red-50'
            : task.priority === 'medium' ? 'border-amber-400 hover:bg-amber-50'
            : task.priority === 'low' ? 'border-blue-400 hover:bg-blue-50'
            : 'border-slate-300 hover:border-brand-500'
        )}
      >
        {task.completed && <span className="block w-1.5 h-1.5 rounded-full bg-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className={clsx('text-sm', task.completed && 'line-through text-slate-400')}>
          {task.title}
        </div>
        {(task.due_date || task.tags.length > 0 || task.priority !== 'none' || task.subtasks?.length > 0) && (
          <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
            {task.due_date && (
              <span className={clsx(
                'inline-flex items-center gap-1',
                overdue ? 'text-red-500' : 'text-slate-500'
              )}>
                <CalendarDays className="w-3 h-3" /> {fmtDate(task.due_date)}
              </span>
            )}
            {task.priority !== 'none' && (
              <Flag className={clsx('w-3 h-3', PRIORITY_COLORS[task.priority])} />
            )}
            {task.subtasks?.length > 0 && (
              <span className="text-slate-400">
                子任务 {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
              </span>
            )}
            {task.tags.map((tag) => (
              <span key={tag.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]" style={{ background: tag.color + '22', color: tag.color }}>
                <Hash className="w-2.5 h-2.5" /> {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
