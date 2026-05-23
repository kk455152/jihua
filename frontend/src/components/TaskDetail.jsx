import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { format } from 'date-fns'
import {
  X, Trash2, Flag, Folder, Hash, CalendarDays, Plus, Check,
} from 'lucide-react'
import clsx from 'clsx'

const PRIORITIES = [
  { v: 'high', label: '高', cls: 'text-red-500' },
  { v: 'medium', label: '中', cls: 'text-amber-500' },
  { v: 'low', label: '低', cls: 'text-blue-500' },
  { v: 'none', label: '无', cls: 'text-slate-400' },
]

export default function TaskDetail() {
  const { activeTask, setActiveTask, updateTask, deleteTask, projects, tags, createTask, toggleTask } = useStore()
  const [draft, setDraft] = useState(null)
  const [newSub, setNewSub] = useState('')

  useEffect(() => { setDraft(activeTask) }, [activeTask?.id])

  if (!activeTask || !draft) {
    return (
      <aside className="w-96 shrink-0 border-l border-slate-200 bg-white hidden lg:flex items-center justify-center text-slate-400 text-sm">
        选中一个任务查看详情
      </aside>
    )
  }

  const save = (patch) => {
    setDraft({ ...draft, ...patch })
    updateTask(draft.id, patch)
  }

  const onTitleBlur = () => {
    if (draft.title !== activeTask.title) save({ title: draft.title })
  }

  const onDescBlur = () => {
    if (draft.description !== activeTask.description) save({ description: draft.description })
  }

  const setDueDate = (val) => save({ due_date: val ? new Date(val).toISOString() : null })
  const setStartDate = (val) => save({ start_date: val ? new Date(val).toISOString() : null })

  const toggleTag = (tagId) => {
    const ids = draft.tags.map((t) => t.id)
    const next = ids.includes(tagId) ? ids.filter((i) => i !== tagId) : [...ids, tagId]
    save({ tag_ids: next })
  }

  const addSubtask = async (e) => {
    e.preventDefault()
    if (!newSub.trim()) return
    await createTask({ title: newSub.trim(), parent_id: draft.id, project_id: draft.project_id })
    setNewSub('')
  }

  const dueValue = draft.due_date ? format(new Date(draft.due_date), "yyyy-MM-dd'T'HH:mm") : ''
  const startValue = draft.start_date ? format(new Date(draft.start_date), "yyyy-MM-dd'T'HH:mm") : ''

  return (
    <aside className="w-96 shrink-0 border-l border-slate-200 bg-white flex flex-col">
      <header className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <span className="text-xs text-slate-500">任务详情</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { if (confirm('删除该任务？')) { deleteTask(draft.id); setActiveTask(null) } }}
            className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTask(null)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => toggleTask(draft.id)}
            className={clsx(
              'mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
              draft.completed ? 'bg-brand-500 border-brand-500' : 'border-slate-300 hover:border-brand-500'
            )}
          >
            {draft.completed && <Check className="w-3 h-3 text-white" />}
          </button>
          <textarea
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            onBlur={onTitleBlur}
            rows={2}
            className={clsx(
              'flex-1 resize-none text-base font-medium bg-transparent outline-none',
              draft.completed && 'line-through text-slate-400'
            )}
          />
        </div>

        <Field icon={CalendarDays} label="开始时间">
          <input
            type="datetime-local"
            value={startValue}
            onChange={(e) => setStartDate(e.target.value)}
            className="input py-1 text-sm"
          />
          {draft.start_date && (
            <button onClick={() => setStartDate('')} className="text-xs text-slate-400 hover:text-red-500 mt-1">清除</button>
          )}
        </Field>

        <Field icon={CalendarDays} label="截止时间">
          <input
            type="datetime-local"
            value={dueValue}
            onChange={(e) => setDueDate(e.target.value)}
            className="input py-1 text-sm"
          />
          {draft.due_date && (
            <button onClick={() => setDueDate('')} className="text-xs text-slate-400 hover:text-red-500 mt-1">清除</button>
          )}
        </Field>

        <Field icon={Flag} label="优先级">
          <div className="flex gap-1.5">
            {PRIORITIES.map((p) => (
              <button
                key={p.v}
                onClick={() => save({ priority: p.v })}
                className={clsx(
                  'px-2.5 py-1 rounded-md text-xs border transition-colors',
                  draft.priority === p.v
                    ? 'bg-brand-50 border-brand-500'
                    : 'border-slate-200 hover:bg-slate-50'
                )}
              >
                <Flag className={clsx('w-3 h-3 inline mr-1', p.cls)} /> {p.label}
              </button>
            ))}
          </div>
        </Field>

        <Field icon={Folder} label="清单">
          <select
            value={draft.project_id || ''}
            onChange={(e) => save({ project_id: e.target.value ? Number(e.target.value) : null })}
            className="input py-1 text-sm"
          >
            <option value="">未分类</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>

        <Field icon={Hash} label="标签">
          <div className="flex gap-1.5 flex-wrap">
            {tags.length === 0 && <span className="text-xs text-slate-400">还没有标签，可在侧栏添加</span>}
            {tags.map((tag) => {
              const active = draft.tags.some((t) => t.id === tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={clsx(
                    'px-2 py-0.5 rounded-full text-xs border transition-colors',
                    active ? 'border-transparent text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                  style={active ? { background: tag.color } : undefined}
                >
                  #{tag.name}
                </button>
              )
            })}
          </div>
        </Field>

        <div>
          <div className="text-xs text-slate-400 mb-2">备注</div>
          <textarea
            value={draft.description || ''}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            onBlur={onDescBlur}
            rows={4}
            placeholder="补充任务详情…"
            className="input text-sm resize-none"
          />
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-2">子任务</div>
          <div className="space-y-1">
            {draft.subtasks?.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => toggleTask(s.id)}
                  className={clsx(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                    s.completed ? 'bg-brand-500 border-brand-500' : 'border-slate-300'
                  )}
                >
                  {s.completed && <span className="block w-1 h-1 rounded-full bg-white" />}
                </button>
                <span className={clsx(s.completed && 'line-through text-slate-400')}>{s.title}</span>
              </div>
            ))}
          </div>
          <form onSubmit={addSubtask} className="mt-2 flex items-center gap-2">
            <Plus className="w-3.5 h-3.5 text-slate-400" />
            <input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              placeholder="添加子任务…"
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </form>
        </div>
      </div>

      <footer className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400">
        创建于 {format(new Date(draft.created_at), 'yyyy-MM-dd HH:mm')}
      </footer>
    </aside>
  )
}

function Field({ icon: Icon, label, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      {children}
    </div>
  )
}
