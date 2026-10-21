import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import BottomNav from './BottomNav'
import DesktopSidebar from './DesktopSidebar'
import RightPanel from './RightPanel'
import { useDesk } from '@/hooks/useDesk'

export default function AppLayout() {
  const desk = useDesk()

  // Computer: a fixed screen. Menu on the left, page in the middle, search + extras on the right.
  // Each panel scrolls on its own and the layout never reflows when the browser is zoomed.
  if (desk) {
    return (
      <div className="h-dvh overflow-x-auto overflow-y-hidden" style={{ backgroundColor: '#09070B' }}>
        <div className="flex h-full min-w-[1200px]">
          <DesktopSidebar />
          <main className="flex-1 min-w-0 h-full overflow-y-auto">
            <Outlet />
          </main>
          <RightPanel />
        </div>
      </div>
    )
  }

  // Phones and tablets
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
