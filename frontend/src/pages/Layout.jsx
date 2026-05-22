import { useEffect } from 'react'
import { useStore } from '../store'
import Sidebar from '../components/Sidebar.jsx'
import TaskList from '../components/TaskList.jsx'
import TaskDetail from '../components/TaskDetail.jsx'

export default function Layout() {
  const { loadProjects, loadTags, loadTasks } = useStore()

  useEffect(() => {
    loadProjects()
    loadTags()
    loadTasks()
  }, [])

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      <Sidebar />
      <TaskList />
      <TaskDetail />
    </div>
  )
}
