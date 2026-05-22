import { create } from 'zustand'
import api from './api'

export const useAuth = create((set) => ({
  token: localStorage.getItem('jihua_token') || null,
  user: JSON.parse(localStorage.getItem('jihua_user') || 'null'),
  login: async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password })
    localStorage.setItem('jihua_token', data.access_token)
    localStorage.setItem('jihua_user', JSON.stringify(data.user))
    set({ token: data.access_token, user: data.user })
  },
  register: async (username, password, email) => {
    const { data } = await api.post('/auth/register', { username, password, email })
    localStorage.setItem('jihua_token', data.access_token)
    localStorage.setItem('jihua_user', JSON.stringify(data.user))
    set({ token: data.access_token, user: data.user })
  },
  logout: () => {
    localStorage.removeItem('jihua_token')
    localStorage.removeItem('jihua_user')
    set({ token: null, user: null })
  },
}))

export const useStore = create((set, get) => ({
  projects: [],
  tags: [],
  tasks: [],
  activeTask: null,
  view: { type: 'today' },
  loading: false,

  setView: (view) => {
    set({ view })
    get().loadTasks()
  },

  loadProjects: async () => {
    const { data } = await api.get('/projects')
    set({ projects: data })
  },
  createProject: async (payload) => {
    const { data } = await api.post('/projects', payload)
    set({ projects: [...get().projects, data] })
    return data
  },
  updateProject: async (id, payload) => {
    const { data } = await api.patch(`/projects/${id}`, payload)
    set({ projects: get().projects.map((p) => (p.id === id ? data : p)) })
  },
  deleteProject: async (id) => {
    await api.delete(`/projects/${id}`)
    set({ projects: get().projects.filter((p) => p.id !== id) })
    if (get().view.type === 'project' && get().view.id === id) {
      get().setView({ type: 'today' })
    }
  },

  loadTags: async () => {
    const { data } = await api.get('/tags')
    set({ tags: data })
  },
  createTag: async (payload) => {
    const { data } = await api.post('/tags', payload)
    set({ tags: [...get().tags, data] })
    return data
  },
  deleteTag: async (id) => {
    await api.delete(`/tags/${id}`)
    set({ tags: get().tags.filter((t) => t.id !== id) })
  },

  loadTasks: async () => {
    const v = get().view
    const params = { archived: false }
    if (v.type === 'today') params.view = 'today'
    else if (v.type === 'week') params.view = 'week'
    else if (v.type === 'inbox') params.view = 'inbox'
    else if (v.type === 'completed') {
      params.completed = true
      params.archived = false
    } else if (v.type === 'project') params.project_id = v.id
    else if (v.type === 'tag') params.tag_id = v.id
    else if (v.type === 'search') params.search = v.query

    set({ loading: true })
    try {
      const { data } = await api.get('/tasks', { params })
      set({ tasks: data })
    } finally {
      set({ loading: false })
    }
    get().loadProjects()
  },

  createTask: async (payload) => {
    const { data } = await api.post('/tasks', payload)
    set({ tasks: [data, ...get().tasks] })
    get().loadProjects()
    return data
  },
  updateTask: async (id, payload) => {
    const { data } = await api.patch(`/tasks/${id}`, payload)
    set({
      tasks: get().tasks.map((t) => (t.id === id ? data : t)),
      activeTask: get().activeTask?.id === id ? data : get().activeTask,
    })
    get().loadProjects()
  },
  toggleTask: async (id) => {
    const { data } = await api.post(`/tasks/${id}/toggle`)
    set({
      tasks: get().tasks.map((t) => (t.id === id ? data : t)),
      activeTask: get().activeTask?.id === id ? data : get().activeTask,
    })
    get().loadProjects()
  },
  deleteTask: async (id) => {
    await api.delete(`/tasks/${id}`)
    set({
      tasks: get().tasks.filter((t) => t.id !== id),
      activeTask: get().activeTask?.id === id ? null : get().activeTask,
    })
    get().loadProjects()
  },
  setActiveTask: (task) => set({ activeTask: task }),
}))
