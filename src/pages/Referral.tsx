import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Gift, Copy, Share2, Users, CheckCircle, ChevronRight, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const DEV = import.meta.env.DEV
const DEV_UID = 'dev-super-admin-id'
const NOW = Date.now()

interface Referral {
  id: string
  referred_name: string
  status: 'pending' | 'completed'
  reward: number
  created_at: string
}

const DEV_REFERRALS: Referral[] = [
  { id: '1', referred_name: 'Chioma Obi', status: 'completed', reward: 100, created_at: new Date(NOW - 86400000 * 2).toISOString() },
  { id: '2', referred_name: 'Emeka Nwosu', status: 'completed', reward: 100, created_at: new Date(NOW - 86400000).toISOString() },
  { id: '3', referred_name: 'Fatima Aliyu', status: 'pending', reward: 0, created_at: new Date(NOW - 3600000).toISOString() },
]

function timeAgo(ts: string) {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  return `${d} days ago`
}

export default function Referral() {
  const navigate = useNavigate()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [code, setCode] = useState('')
  const [totalEarned, setTotalEarned] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id ?? (DEV ? DEV_UID : null)
      if (!uid) return

      // Generate deterministic referral code from uid
      const shortCode = 'KSJ' + uid.slice(0, 6).toUpperCase()
      setCode(shortCode)

      if (DEV) {
        setReferrals(DEV_REFERRALS)
        setTotalEarned(1000)
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', uid)
        .order('created_at', { ascending: false })

      const list = (data ?? []) as Referral[]
      setReferrals(list)
      setTotalEarned(list.filter(r => r.status === 'completed').reduce((s, r) => s + r.reward, 0))
      setLoading(false)
    })()
  }, [])

  function copyCode() {
    void navigator.clipboard.writeText(code)
    toast.success('Referral code copied!')
  }

  function shareLink() {
    const url = `https://kasaja.ng/join?ref=${code}`
    if (navigator.share) {
      void navigator.share({ title: 'Join KASAJA', text: `Use my code ${code} to join KASAJA and we both earn ₦100 when you complete your first order!`, url })
    } else {
      void navigator.clipboard.writeText(url)
      toast.success('Link copied!')
    }
  }

  return (
    <div className="min-h-dvh pb-28" style={{ background: '#080A0D' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: 'rgba(8,10,13,0.95)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <button onClick={() => void navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h1 className="font-bold text-white text-lg flex-1" style={{ fontFamily: 'Space Grotesk,sans-serif' }}>
          Refer & Earn
        </h1>
      </div>

      {/* Hero card */}
      <div className="mx-4 mt-4 rounded-3xl p-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)' }}>
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-20"
          style={{ background: 'rgba(255,255,255,0.3)' }} />
        <div className="absolute -right-4 bottom-0 w-24 h-24 rounded-full opacity-10"
          style={{ background: 'rgba(255,255,255,0.5)' }} />
        <Gift size={32} className="text-white mb-3" />
        <h2 className="text-white font-bold text-xl mb-1" style={{ fontFamily: 'Space Grotesk,sans-serif' }}>
          Earn ₦100 per active referral
        </h2>
        <p className="text-white/80 text-sm mb-4">
          Invite friends to KASAJA. When they complete their first order, you both earn ₦100.
        </p>
        <div className="flex gap-2">
          <div className="bg-white/20 rounded-xl px-3 py-2 flex-1 flex items-center justify-between backdrop-blur">
            <span className="text-white font-bold tracking-widest text-sm">{code || '...'}</span>
            <button onClick={copyCode} className="text-white/70 hover:text-white">
              <Copy size={16} />
            </button>
          </div>
          <button onClick={shareLink}
            className="bg-white text-purple-700 rounded-xl px-4 py-2 font-bold text-sm flex items-center gap-1.5">
            <Share2 size={15} /> Share
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mx-4 mt-4">
        {[
          { label: 'Invited', value: String(referrals.length), icon: Users, color: '#7C3AED' },
          { label: 'Completed', value: String(referrals.filter(r => r.status === 'completed').length), icon: CheckCircle, color: '#10B981' },
          { label: 'Earned', value: `₦${totalEarned.toLocaleString()}`, icon: Zap, color: '#F59E0B' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-3.5" style={{ background: '#11151A' }}>
            <Icon size={18} style={{ color }} className="mb-2" />
            <p className="text-white font-bold text-base">{value}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="mx-4 mt-5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>How it works</p>
        <div className="space-y-2">
          {[
            { step: '1', text: 'Share your code with a friend', color: '#7C3AED' },
            { step: '2', text: 'Friend signs up using your code', color: '#06B6D4' },
            { step: '3', text: 'Friend completes their first order', color: '#10B981' },
            { step: '4', text: 'You both earn ₦100 once they are active', color: '#F59E0B' },
          ].map(({ step, text, color }) => (
            <div key={step} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: '#11151A' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                style={{ background: `${color}22`, color }}>
                {step}
              </div>
              <p className="text-white text-sm">{text}</p>
              {step === '4' && <ChevronRight size={14} className="ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Referral history */}
      <div className="mx-4 mt-5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>
          Your referrals ({referrals.length})
        </p>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: '#11151A' }} />
            ))}
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-8">
            <Users size={32} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.2)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No referrals yet. Share your code!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {referrals.map((r, i) => (
              <motion.div key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: '#11151A' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: 'rgba(124,58,237,0.2)', color: '#7C3AED' }}>
                  {r.referred_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{r.referred_name}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{timeAgo(r.created_at)}</p>
                </div>
                {r.status === 'completed' ? (
                  <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                    +₦{r.reward}
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                    Pending
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
