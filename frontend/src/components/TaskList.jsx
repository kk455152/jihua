import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { Plus, Loader2 } from 'lucide-react'
import TaskItem from './TaskItem.jsx'

const VIEW_TITLES = {
  today: '今天',
  week: '最近 7 天',
  inbox: '收件箱',
  completed: '已完成',
}

export default function TaskList() {
  const { view, tasks, projects, loading, createTask } = useStore()
  const [title, setTitle] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)

  const headerTitle = useMemo(() => {
    if (view.type in VIEW_TITLES) return VIEW_TITLES[view.type]
    if (view.type === 'project') return projects.find((p) => p.id === view.id)?.name || '清单'
    if (view.type === 'tag') return `#${view.name || '标签'}`
    if (view.type === 'search') return `搜索：${view.query}`
    return '任务'
  }, [view, projects])

  const onCreate = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    const payload = { title: title.trim() }
    if (view.type === 'project') payload.project_id = view.id
    if (view.type === 'today') payload.due_date = new Date().toISOString()
    await createTask(payload)
    setTitle('')
  }

  const active = tasks.filter((t) => !t.completed)
  const completed = tasks.filter((t) => t.completed)

  return (
    <main className="flex-1 flex flex-col min-w-0">
      <header className="px-8 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{headerTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {active.length} 个待办 · {completed.length} 已完成
          </p>
        </div>
      </header>

      {view.type !== 'completed' && view.type !== 'search' && (
        <form onSubmit={onCreate} className="px-8 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-brand-500 focus-within:border-brand-500 transition-colors">
            <Plus className="w-4 h-4 text-slate-400" />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="添加任务，回车保存…"
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto px-8 py-3">
        {loading && (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {!loading && active.length === 0 && completed.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-sm">还没有任务，开始添加你的第一个任务吧</p>
          </div>
        )}

        <div className="space-y-1">
          {active.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>

        {completed.length > 0 && view.type !== 'completed' && (
          <div className="mt-6">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-xs text-slate-400 hover:text-slate-600 mb-2"
            >
              {showCompleted ? '隐藏' : '显示'} 已完成（{completed.length}）
            </button>
            {showCompleted && (
              <div className="space-y-1">
                {completed.map((task) => <TaskItem key={task.id} task={task} />)}
              </div>
            )}
          </div>
        )}

        {view.type === 'completed' && completed.length > 0 && (
          <div className="space-y-1">
            {completed.map((task) => <TaskItem key={task.id} task={task} />)}
          </div>
        )}
      </div>
    </main>
  )
}
