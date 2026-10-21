import { useAuth } from '@/hooks/useAuth'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/** "Good morning, Ada" with an initial avatar. Sits above the stories row on Home. */
export default function HomeGreeting() {
  const { profile } = useAuth()
  const name = (profile?.display_name || '').trim().split(' ')[0] || 'there'

  return (
    <div className="px-4 pt-4 pb-1 flex items-center gap-3">
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
      ) : (
        <span className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-black"
          style={{ background: 'linear-gradient(135deg,#FF6A13,#E24A00)' }}>
          {name[0]?.toUpperCase()}
        </span>
      )}
      <div>
        <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{greeting()}</p>
        <p className="text-lg font-extrabold tracking-tight text-white leading-tight">{name}</p>
      </div>
    </div>
  )
}
