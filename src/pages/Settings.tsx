import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Moon, Sun, Bell, Lock, User, Store, Bike, Shield, ChevronRight, Check } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { requestPushPermission, subscribeToPush, unsubscribeFromPush } from '@/lib/pushNotifications'

interface ToggleProps { checked: boolean; onChange: (v: boolean) => void }
const Toggle = ({ checked, onChange }: ToggleProps) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-brand-500' : 'bg-zinc-700'}`}
  >
    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${checked ? 'translate-x-5.5 left-0.5' : 'left-0.5'}`} />
  </button>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-6">
    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-4 mb-1">{title}</p>
    <div className="bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-zinc-800">{children}</div>
  </div>
)

const Row = ({ icon, label, sublabel, right, onClick }: {
  icon: React.ReactNode; label: string; sublabel?: string
  right?: React.ReactNode; onClick?: () => void
}) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 ${onClick ? 'active:bg-zinc-800' : ''}`}>
    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-brand-500 shrink-0">{icon}</div>
    <div className="flex-1 text-left">
      <p className="text-sm font-medium text-white">{label}</p>
      {sublabel && <p className="text-xs text-zinc-500 mt-0.5">{sublabel}</p>}
    </div>
    {right ?? (onClick && <ChevronRight size={16} className="text-zinc-600" />)}
  </button>
)

export default function Settings() {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { user, signOut } = useAuth()

  // Notification prefs (saved to localStorage for now)
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem('push_enabled') === 'true')
  const [notifMessages, setNotifMessages] = useState(() => localStorage.getItem('notif_messages') !== 'false')
  const [notifOrders, setNotifOrders] = useState(() => localStorage.getItem('notif_orders') !== 'false')
  const [notifDelivery, setNotifDelivery] = useState(() => localStorage.getItem('notif_delivery') !== 'false')
  const [notifGroupPosts, setNotifGroupPosts] = useState(() => localStorage.getItem('notif_group_posts') !== 'false')
  const [notifPromos, setNotifPromos] = useState(() => localStorage.getItem('notif_promos') !== 'false')

  // Privacy
  const [showPhone, setShowPhone] = useState(() => localStorage.getItem('privacy_show_phone') !== 'false')
  const [showLastSeen, setShowLastSeen] = useState(() => localStorage.getItem('privacy_last_seen') !== 'false')
  const [allowMessages, setAllowMessages] = useState(() => localStorage.getItem('privacy_allow_messages') !== 'false')

  // Seller
  const [vacationMode, setVacationMode] = useState(() => localStorage.getItem('seller_vacation') === 'true')
  const [autoAccept, setAutoAccept] = useState(() => localStorage.getItem('seller_auto_accept') === 'true')

  // Rider
  const [surgeAlerts, setSurgeAlerts] = useState(() => localStorage.getItem('rider_surge') !== 'false')

  // Buyer
  const [defaultEscrow, setDefaultEscrow] = useState(() => localStorage.getItem('buyer_escrow') !== 'false')

  // Text size
  const [textSize, setTextSize] = useState<'normal' | 'large'>(() =>
    (localStorage.getItem('text_size') as 'normal' | 'large') ?? 'normal'
  )

  const save = (key: string, value: boolean) => localStorage.setItem(key, String(value))

  const handleDeleteAccount = async () => {
    if (!confirm('Request account deletion?\n\nYour account will be deactivated and hidden from other users. Your data is retained for 90 days for legal and fraud-prevention purposes, then permanently removed.')) return
    const reason = window.prompt('Optional: Tell us why you are leaving (helps us improve)')
    if (!user) return
    await supabase.from('profiles').update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deletion_reason: reason ?? null,
      display_name: '[Deleted Account]',
      avatar_url: null,
      bio: null,
      phone: null,
    }).eq('id', user.id)
    await supabase.auth.signOut()
    toast.success('Account deactivated. Your data will be retained for 90 days for verification purposes.')
    void navigate('/login')
  }

  const handleSignOut = async () => {
    await signOut()
    void navigate('/login')
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-canvas/95 backdrop-blur z-10 flex items-center gap-3 px-4 py-4 border-b border-zinc-800">
        <button onClick={() => void navigate(-1)} className="p-2 rounded-xl hover:bg-zinc-800">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h1 className="text-lg font-bold text-white font-display">Settings</h1>
      </div>

      <div className="px-0 py-4">

        {/* APPEARANCE */}
        <Section title="Appearance">
          <Row
            icon={theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            label="Theme"
            sublabel={theme === 'dark' ? 'Dark mode' : 'Light mode'}
            right={
              <div className="flex items-center gap-2">
                <Sun size={14} className="text-zinc-500" />
                <Toggle checked={theme === 'dark'} onChange={() => toggle()} />
                <Moon size={14} className="text-zinc-500" />
              </div>
            }
          />
          <Row
            icon={<span className="text-xs font-bold">Aa</span>}
            label="Text Size"
            sublabel={textSize === 'normal' ? 'Normal' : 'Large'}
            right={
              <div className="flex gap-1">
                {(['normal', 'large'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { setTextSize(s); localStorage.setItem('text_size', s); document.documentElement.style.fontSize = s === 'large' ? '17px' : '16px' }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${textSize === s ? 'bg-brand-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            }
          />
        </Section>

        {/* NOTIFICATIONS */}
        <Section title="Notifications">
          <Row
            icon={<Bell size={16} />}
            label="Push Notifications"
            sublabel="Receive alerts when app is closed"
            right={<Toggle checked={pushEnabled} onChange={v => { void (async () => {
              if (v) {
                const granted = await requestPushPermission()
                if (granted && user?.id) {
                  await subscribeToPush(user.id)
                  setPushEnabled(true)
                  save('push_enabled', true)
                  toast.success('Push notifications enabled')
                } else {
                  toast.error('Permission denied — enable in browser settings')
                }
              } else {
                if (user?.id) await unsubscribeFromPush(user.id)
                setPushEnabled(false)
                save('push_enabled', false)
                toast.info('Push notifications disabled')
              }
            })() }} />}
          />
          <Row icon={<Bell size={16} />} label="New Messages" right={<Toggle checked={notifMessages} onChange={v => { setNotifMessages(v); save('notif_messages', v) }} />} />
          <Row icon={<Bell size={16} />} label="Order Updates" sublabel="Paid, shipped, delivered" right={<Toggle checked={notifOrders} onChange={v => { setNotifOrders(v); save('notif_orders', v) }} />} />
          <Row icon={<Bell size={16} />} label="Delivery Status" right={<Toggle checked={notifDelivery} onChange={v => { setNotifDelivery(v); save('notif_delivery', v) }} />} />
          <Row icon={<Bell size={16} />} label="Market Group Posts" sublabel="New posts in your groups" right={<Toggle checked={notifGroupPosts} onChange={v => { setNotifGroupPosts(v); save('notif_group_posts', v) }} />} />
          <Row icon={<Bell size={16} />} label="Promotions & Deals" right={<Toggle checked={notifPromos} onChange={v => { setNotifPromos(v); save('notif_promos', v) }} />} />
        </Section>

        {/* PRIVACY */}
        <Section title="Privacy">
          <Row icon={<Lock size={16} />} label="Show Phone Number" sublabel="Visible to buyers on your store" right={<Toggle checked={showPhone} onChange={v => { setShowPhone(v); save('privacy_show_phone', v) }} />} />
          <Row icon={<Lock size={16} />} label="Show Last Seen" right={<Toggle checked={showLastSeen} onChange={v => { setShowLastSeen(v); save('privacy_last_seen', v) }} />} />
          <Row icon={<Lock size={16} />} label="Allow Direct Messages" sublabel="Anyone can message you" right={<Toggle checked={allowMessages} onChange={v => { setAllowMessages(v); save('privacy_allow_messages', v) }} />} />
        </Section>

        {/* BUYER */}
        <Section title="Buyer Settings">
          <Row
            icon={<Shield size={16} />}
            label="Default Escrow Protection"
            sublabel="Automatically enable buyer protection on new orders"
            right={<Toggle checked={defaultEscrow} onChange={v => { setDefaultEscrow(v); save('buyer_escrow', v) }} />}
          />
          <Row icon={<User size={16} />} label="Default Delivery Address" sublabel="Lagos Island, Lagos" onClick={() => void navigate('/profile')} />
        </Section>

        {/* SELLER */}
        <Section title="Seller Settings">
          <Row
            icon={<Store size={16} />}
            label="Vacation Mode"
            sublabel="Pause your store — no new orders"
            right={<Toggle checked={vacationMode} onChange={v => { setVacationMode(v); save('seller_vacation', v); toast.info(v ? 'Store paused — buyers will see "Unavailable"' : 'Store is now active') }} />}
          />
          <Row
            icon={<Store size={16} />}
            label="Auto-Accept Orders"
            sublabel="Instantly accept orders under ₦10,000"
            right={<Toggle checked={autoAccept} onChange={v => { setAutoAccept(v); save('seller_auto_accept', v) }} />}
          />
          <Row icon={<Store size={16} />} label="Payment Account" sublabel="Add your bank account for withdrawals" onClick={() => void navigate('/profile')} />
        </Section>

        {/* RIDER */}
        <Section title="Rider Settings">
          <Row
            icon={<Bike size={16} />}
            label="Surge Alerts"
            sublabel="Get notified when demand is high in your area"
            right={<Toggle checked={surgeAlerts} onChange={v => { setSurgeAlerts(v); save('rider_surge', v) }} />}
          />
          <Row icon={<Bike size={16} />} label="Vehicle Type" sublabel="Motorcycle" onClick={() => toast.info('Vehicle type editing coming soon')} />
          <Row icon={<Bike size={16} />} label="Max Delivery Radius" sublabel="15 km" onClick={() => toast.info('Radius editing coming soon')} />
        </Section>

        {/* SECURITY */}
        <Section title="Security">
          <Row icon={<Shield size={16} />} label="Two-Factor Authentication" sublabel="Add extra security to your account" onClick={() => toast.info('2FA coming soon')} />
          <Row icon={<Shield size={16} />} label="Biometric & PIN Login" sublabel="Face ID, fingerprint, or PIN" onClick={() => void navigate('/security-setup')} />
          <Row icon={<Shield size={16} />} label="Account Activity Log" sublabel="Login history and security events" onClick={() => void navigate('/activity-log')} />
          <Row icon={<Shield size={16} />} label="Transaction PIN" sublabel="Required for withdrawals" onClick={() => toast.info('Transaction PIN coming soon')} />
          <Row icon={<Shield size={16} />} label="Active Sessions" sublabel="See devices logged in to your account" onClick={() => toast.info('Session management coming soon')} />
        </Section>

        {/* ACCOUNT */}
        <Section title="Account">
          <Row icon={<User size={16} />} label="Edit Profile" onClick={() => void navigate('/profile')} />
          <Row icon={<User size={16} />} label="Download My Data" sublabel="Get a copy of all your data" onClick={() => toast.info('Data export coming soon')} />
          <Row
            icon={<Check size={16} />}
            label="App Version"
            sublabel="KASAJA v1.0.0 (Beta)"
            right={<span className="text-xs text-zinc-500">Beta</span>}
          />
        </Section>

        {/* SIGN OUT + DELETE */}
        <div className="px-4 space-y-3 mt-2">
          <button
            onClick={() => void handleSignOut()}
            className="w-full py-3.5 rounded-2xl bg-zinc-900 text-white font-bold text-sm border border-zinc-800"
          >
            Sign Out
          </button>
          <button
            onClick={() => void handleDeleteAccount()}
            className="w-full py-3.5 rounded-2xl text-red-500 font-bold text-sm"
          >
            Delete Account
          </button>
        </div>

      </div>
    </div>
  )
}
