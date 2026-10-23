import { useAuth } from '@/hooks/useAuth'
import { UserTicks } from '@/components/Tick'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/** "Good morning, Ada" with an initial avatar. Phone and tablet only. */
export default function HomeGreeting() {
  const { profile } = useAuth()
  const name = (profile?.display_name || '').trim().split(' ')[0] || 'there'

  return (
    <div className="px-4 pt-4 pb-1 flex items-center gap-3">
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
      ) : (
        <span className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold"
          style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}>
          {name[0]?.toUpperCase()}
        </span>
      )}
      <div>
        <p className="text-[13px]" style={{ color: 'var(--k-muted)' }}>{greeting()}</p>
        <p className="text-lg font-extrabold tracking-tight leading-tight" style={{ color: 'var(--k-text)' }}>{name}<span className="ml-1.5 align-middle"><UserTicks userId={profile?.id} size={16} /></span></p>
      </div>
    </div>
  )
}
