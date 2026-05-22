import { useState } from 'react'
import { useStore, useAuth } from '../store'
import {
  Inbox, Sun, CalendarDays, CheckCircle2, Hash, Plus,
  Folder, LogOut, Search, Trash2,
} from 'lucide-react'
import clsx from 'clsx'

export default function Sidebar() {
  const { projects, tags, view, setView, createProject, deleteProject, createTag, deleteTag } = useStore()
  const { user, logout } = useAuth()
  const [showProjectInput, setShowProjectInput] = useState(false)
  const [showTagInput, setShowTagInput] = useState(false)
  const [newProject, setNewProject] = useState('')
  const [newTag, setNewTag] = useState('')
  const [search, setSearch] = useState('')

  const isActive = (predicate) => clsx(
    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors group',
    predicate ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-200/60'
  )

  const onAddProject = async (e) => {
    e.preventDefault()
    if (!newProject.trim()) return
    await createProject({ name: newProject.trim() })
    setNewProject(''); setShowProjectInput(false)
  }

  const onAddTag = async (e) => {
    e.preventDefault()
    if (!newTag.trim()) return
    const palette = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']
    await createTag({ name: newTag.trim(), color: palette[Math.floor(Math.random() * palette.length)] })
    setNewTag(''); setShowTagInput(false)
  }

  const onSearch = (e) => {
    e.preventDefault()
    if (search.trim()) setView({ type: 'search', query: search.trim() })
  }

  return (
    <aside className="w-64 shrink-0 bg-slate-100 border-r border-slate-200 flex flex-col">
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-brand-500" />
            <span className="font-semibold">计划 · Jihua</span>
          </div>
          <button onClick={logout} className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500" title="退出">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-slate-500 mt-1">你好，{user?.username}</div>
      </div>

      <form onSubmit={onSearch} className="px-3 pt-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-8 py-1.5 text-sm bg-white"
            placeholder="搜索任务…"
          />
        </div>
      </form>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        <div className="space-y-0.5">
          <div onClick={() => setView({ type: 'today' })} className={isActive(view.type === 'today')}>
            <Sun className="w-4 h-4" /> 今天
          </div>
          <div onClick={() => setView({ type: 'week' })} className={isActive(view.type === 'week')}>
            <CalendarDays className="w-4 h-4" /> 最近 7 天
          </div>
          <div onClick={() => setView({ type: 'inbox' })} className={isActive(view.type === 'inbox')}>
            <Inbox className="w-4 h-4" /> 收件箱
          </div>
          <div onClick={() => setView({ type: 'completed' })} className={isActive(view.type === 'completed')}>
            <CheckCircle2 className="w-4 h-4" /> 已完成
          </div>
        </div>

        <Section
          title="清单"
          onAdd={() => setShowProjectInput(true)}
        >
          {showProjectInput && (
            <form onSubmit={onAddProject} className="px-2 mb-1">
              <input
                autoFocus
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                onBlur={() => { if (!newProject.trim()) setShowProjectInput(false) }}
                placeholder="清单名称，回车确认"
                className="input text-sm py-1 bg-white"
              />
            </form>
          )}
          {projects.map((p) => (
            <div key={p.id} className={isActive(view.type === 'project' && view.id === p.id)} onClick={() => setView({ type: 'project', id: p.id, name: p.name })}>
              <Folder className="w-4 h-4" style={{ color: p.color }} />
              <span className="flex-1 truncate">{p.name}</span>
              <span className="text-xs opacity-70">{p.task_count || ''}</span>
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm(`删除清单 "${p.name}" 及其下所有任务？`)) deleteProject(p.id) }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </Section>

        <Section title="标签" onAdd={() => setShowTagInput(true)}>
          {showTagInput && (
            <form onSubmit={onAddTag} className="px-2 mb-1">
              <input
                autoFocus
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onBlur={() => { if (!newTag.trim()) setShowTagInput(false) }}
                placeholder="标签名，回车确认"
                className="input text-sm py-1 bg-white"
              />
            </form>
          )}
          {tags.map((t) => (
            <div key={t.id} className={isActive(view.type === 'tag' && view.id === t.id)} onClick={() => setView({ type: 'tag', id: t.id, name: t.name })}>
              <Hash className="w-4 h-4" style={{ color: t.color }} />
              <span className="flex-1 truncate">{t.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm(`删除标签 "${t.name}"？`)) deleteTag(t.id) }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </Section>
      </nav>
    </aside>
  )
}

function Section({ title, onAdd, children }) {
  return (
    <div>
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <button onClick={onAdd} className="p-0.5 rounded hover:bg-slate-200 text-slate-400">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}
