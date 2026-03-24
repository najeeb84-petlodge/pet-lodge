import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Bell } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { profile } = useAuth()
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-10">
          <div/>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell size={20}/>
            </button>
            <div className="text-sm text-slate-500">
              Welcome back, <span className="font-medium text-slate-800">{profile?.full_name?.split(' ')[0] ?? 'there'}</span>
            </div>
          </div>
        </header>
        {/* Page content */}
        <main className="flex-1 p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
