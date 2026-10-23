import { ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { isStaff } from '@/lib/staff'

/** Wrap a page that staff must not use. Staff see a plain notice instead. */
export default function StaffGuard({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  if (!isStaff(profile?.roles)) return <>{children}</>
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6" style={{ color: 'var(--k-text)' }}>
      <ShieldAlert size={34} style={{ color: 'var(--k-accent)' }} />
      <h1 className="mt-4 text-xl font-extrabold">Staff accounts can't do this</h1>
      <p className="mt-2 text-sm max-w-xs" style={{ color: 'var(--k-muted)' }}>
        KASAJA Team accounts review and protect the platform. They can't buy, sell, post, request or ride. Use a normal account for that.
      </p>
      <button onClick={() => void navigate('/admin')} className="mt-5 h-11 px-5 rounded-xl text-sm font-extrabold"
        style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}>Back to admin</button>
    </div>
  )
}
