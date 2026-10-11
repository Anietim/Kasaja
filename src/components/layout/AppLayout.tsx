import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import BottomNav from './BottomNav'

export default function AppLayout() {
  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <Navbar />
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
