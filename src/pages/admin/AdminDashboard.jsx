import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import TopNav from '../../components/TopNav'
import AllBookings from './tabs/AllBookings'
import ModificationRequests from './tabs/ModificationRequests'
import WeeklyCalendar from './tabs/WeeklyCalendar'
import PricesMaster from './tabs/PricesMaster'
import FormResponses from './tabs/FormResponses'
import UserManagement from './tabs/UserManagement'

const TABS = [
  { id:'bookings',    label:'All Bookings',           icon:'📅' },
  { id:'mods',        label:'Modification Requests',  icon:'🔔' },
  { id:'calendar',    label:'Calendar View',           icon:'📅' },
  { id:'prices',      label:'Prices Master',           icon:'$'  },
  { id:'responses',   label:'Form Responses',          icon:'📋' },
  { id:'users',       label:'User Management',         icon:'👥', adminOnly: true },
]

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('bookings')

  const isSuperAdmin = profile?.role === 'super_admin'
  const isAdmin      = profile?.role === 'admin' || isSuperAdmin
  const visibleTabs  = TABS.filter(t => !t.adminOnly || isSuperAdmin)

  return (
    <div className="min-h-screen" style={{ background:'#f8f9f6' }}>
      <TopNav />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color:'var(--text)' }}>Pet Lodge Admin Dashboard</h1>
            <p className="text-sm" style={{ color:'var(--muted)' }}>Manage bookings and view business analytics</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            🔄 Initialize Services
          </button>
        </div>

        {/* Tab navigation */}
        <div className="bg-white rounded-xl border mb-6 overflow-x-auto" style={{ borderColor:'var(--border)' }}>
          <div className="flex">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}>
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'bookings'  && <AllBookings  isSuperAdmin={isSuperAdmin} isAdmin={isAdmin}/>}
        {activeTab === 'mods'      && <ModificationRequests/>}
        {activeTab === 'calendar'  && <WeeklyCalendar/>}
        {activeTab === 'prices'    && <PricesMaster isSuperAdmin={isSuperAdmin}/>}
        {activeTab === 'responses' && <FormResponses isSuperAdmin={isSuperAdmin} isAdmin={isAdmin}/>}
        {activeTab === 'users'     && isSuperAdmin && <UserManagement isSuperAdmin={isSuperAdmin}/>}
      </div>
    </div>
  )
}
