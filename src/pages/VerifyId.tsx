import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, FileImage, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { openPaystackCheckout, generateRef } from '@/lib/paystack'
import { KTick, clearTickCache } from '@/components/Tick'
import { useIdStatus, ID_FEE_KOBO, ID_FEE_NAIRA } from '@/hooks/useIdVerification'
import '@/styles/kasaja-theme.css'

const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const FIELD = { background: 'var(--k-surface)', border: '1px solid var(--k-line)', color: 'var(--k-text)' }

export default function VerifyId() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { status, attempts, loading, refresh } = useIdStatus()
  const [waiting, setWaiting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fullName, setFullName] = useState(profile?.display_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [stateName, setStateName] = useState(profile?.state ?? '')
  const [city, setCity] = useState('')
  const [idType, setIdType] = useState<'nin' | 'bvn'>('nin')
  const [idNumber, setIdNumber] = useState('')
  const [selfie, setSelfie] = useState<File | null>(null)
  const [idPhoto, setIdPhoto] = useState<File | null>(null)
  const selfieRef = useRef<HTMLInputElement>(null)
  const idRef = useRef<HTMLInputElement>(null)

  // after paying, wait for the webhook to confirm
  useEffect(() => {
    if (!waiting) return
    let tries = 0
    const t = setInterval(() => {
      tries++
      void refresh()
      if (tries > 20) { clearInterval(t); setWaiting(false); toast('Payment received. It can take a minute to show. Reopen this page if nothing changes.') }
    }, 2000)
    return () => clearInterval(t)
  }, [waiting, refresh])
  useEffect(() => { if (waiting && (status === 'paid' || status === 'reviewing')) setWaiting(false) }, [status, waiting])

  async function pay() {
    if (!user?.email) { toast.error('Sign in again to continue'); return }
    try {
      await openPaystackCheckout({
        email: user.email,
        amount: ID_FEE_KOBO,
        ref: generateRef('KASAJA_ID'),
        metadata: { type: 'id_verification', user_id: user.id },
        callback: (response: { reference: string }) => {
          setWaiting(true)
          void (async () => {
            // ask Paystack right away, so the form opens in seconds
            const { data, error } = await supabase.functions.invoke('smart-processor', { body: { reference: response.reference } })
            if (!error && (data as { ok?: boolean } | null)?.ok) { toast.success('Payment confirmed'); clearTickCache(user.id) }
            await refresh()
          })()
        },
        onClose: () => { /* closed without paying */ },
      })
    } catch { toast.error('Could not open the payment window') }
  }

  async function upload(file: File, label: string): Promise<string> {
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${user!.id}/${label}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('kyc').upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw error
    return path
  }

  async function submit() {
    if (!user) return
    if (!fullName.trim() || !phone.trim()) { toast.error('Enter your full name and phone number'); return }
    if (!/^\d{11}$/.test(idNumber)) { toast.error('Your NIN or BVN is 11 digits'); return }
    if (!selfie || !idPhoto) { toast.error('Add your selfie and a photo of your ID'); return }
    for (const f of [selfie, idPhoto]) {
      if (!OK_TYPES.includes(f.type)) { toast.error('Use JPEG, PNG or WebP photos'); return }
      if (f.size > 10 * 1024 * 1024) { toast.error('Each photo must be under 10 MB'); return }
    }
    setBusy(true)
    try {
      const [s, p] = [await upload(selfie, 'selfie'), await upload(idPhoto, 'id')]
      const { error } = await supabase.rpc('submit_id_verification', {
        p_full_name: fullName.trim(), p_phone: phone.trim(), p_state: stateName.trim(), p_city: city.trim(),
        p_id_type: idType, p_id_number: idNumber, p_selfie: s, p_id_photo: p,
      })
      if (error) throw error
      toast.success('Submitted. We will review it shortly.')
      setIdNumber('')
      clearTickCache(user.id)
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Could not submit')
    } finally { setBusy(false) }
  }

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-dvh pb-24" style={{ background: 'var(--k-bg)', color: 'var(--k-text)' }}>
      <div className="max-w-md mx-auto px-5 pt-4">
        <button onClick={() => void navigate(-1)} aria-label="Back" className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full"><ArrowLeft size={20} /></button>
        {children}
      </div>
    </div>
  )

  if (loading) return <Shell><div className="py-24 flex justify-center"><Loader2 className="animate-spin" /></div></Shell>

  if (status === 'verified') return (
    <Shell>
      <div className="text-center pt-10">
        <div className="mx-auto w-24 h-24 rounded-3xl flex items-center justify-center" style={{ background: 'var(--k-surface2)' }}><KTick kind="id" size={64} /></div>
        <h1 className="mt-6 text-2xl font-extrabold">You have the black tick</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--k-muted)' }}>Your ID is verified. Withdrawals are unlocked. You can now add a role tick (seller, rider or personal shopper).</p>
        <button onClick={() => void navigate('/profile')} className="mt-8 h-12 px-8 rounded-2xl font-extrabold" style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}>Done</button>
      </div>
    </Shell>
  )

  if (status === 'reviewing') return (
    <Shell>
      <div className="text-center pt-10">
        <div className="mx-auto w-24 h-24 rounded-3xl flex items-center justify-center" style={{ background: 'var(--k-surface2)' }}><Loader2 size={36} className="animate-spin" style={{ color: 'var(--k-accent)' }} /></div>
        <h1 className="mt-6 text-2xl font-extrabold">Under review</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--k-muted)' }}>We are checking your details and selfie. You will get a notification when it is done, usually within a day.</p>
      </div>
    </Shell>
  )

  const canSubmit = status === 'paid' || (status === 'rejected' && attempts > 0)

  if (!canSubmit) return (
    <Shell>
      <div className="pt-6">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'var(--k-surface2)' }}><KTick kind="id" size={52} /></div>
        <h1 className="mt-5 text-2xl font-extrabold leading-tight">Get your black tick</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--k-muted)' }}>
          {status === 'rejected' ? 'Your last check was not approved. Pay again to try again.' : 'A verified ID builds trust with buyers, sellers and riders, and unlocks withdrawals.'}
        </p>
        <ul className="mt-5 space-y-2 text-sm">
          {['Your NIN or BVN (11 digits)', 'A selfie', 'A photo of your ID card or NIN slip'].map(t => (
            <li key={t} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--k-accent)' }} />{t}</li>
          ))}
        </ul>
        <div className="mt-6 rounded-2xl p-4 text-sm" style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)' }}>
          <div className="flex justify-between"><span style={{ color: 'var(--k-muted)' }}>Verification fee</span><span className="font-extrabold font-mono">₦{ID_FEE_NAIRA}</span></div>
          <p className="mt-2 text-xs" style={{ color: 'var(--k-muted)' }}>Covers up to 3 attempts. Your ID number is used for the check and then erased. Photos are private.</p>
        </div>
        <button onClick={() => void pay()} disabled={waiting} className="mt-6 w-full h-[52px] rounded-2xl font-extrabold flex items-center justify-center gap-2" style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)', opacity: waiting ? 0.7 : 1 }}>
          {waiting ? <><Loader2 size={18} className="animate-spin" /> Confirming payment...</> : `Pay ₦${ID_FEE_NAIRA}`}
        </button>
      </div>
    </Shell>
  )

  return (
    <Shell>
      <div className="pt-4">
        <h1 className="text-2xl font-extrabold">Your details</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--k-muted)' }}>Use the name on your ID. Attempts left: {attempts}</p>
        <div className="mt-5 space-y-3">
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name (as on your ID)" className="w-full h-12 rounded-xl px-4 text-sm outline-none" style={FIELD} />
          <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" placeholder="Phone number" className="w-full h-12 rounded-xl px-4 text-sm outline-none" style={FIELD} />
          <div className="grid grid-cols-2 gap-3">
            <input value={stateName} onChange={e => setStateName(e.target.value)} placeholder="State" className="h-12 rounded-xl px-4 text-sm outline-none" style={FIELD} />
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" className="h-12 rounded-xl px-4 text-sm outline-none" style={FIELD} />
          </div>
          <div className="flex gap-2">
            {(['nin', 'bvn'] as const).map(t => (
              <button key={t} onClick={() => setIdType(t)} className="flex-1 h-11 rounded-xl text-sm font-extrabold uppercase"
                style={idType === t ? { background: 'var(--k-accent)', color: 'var(--k-on-accent)' } : { ...FIELD, color: 'var(--k-muted)' }}>{t}</button>
            ))}
          </div>
          <input value={idNumber} onChange={e => setIdNumber(e.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="numeric" placeholder={`${idType.toUpperCase()} number (11 digits)`} className="w-full h-12 rounded-xl px-4 text-sm outline-none font-mono tracking-wider" style={FIELD} />

          <input ref={selfieRef} type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="hidden" onChange={e => setSelfie(e.target.files?.[0] ?? null)} />
          <input ref={idRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => setIdPhoto(e.target.files?.[0] ?? null)} />
          <button onClick={() => selfieRef.current?.click()} className="w-full h-12 rounded-xl px-4 flex items-center gap-3 text-sm" style={FIELD}>
            <Camera size={18} style={{ color: 'var(--k-accent)' }} />{selfie ? selfie.name : 'Take a selfie'}
          </button>
          <button onClick={() => idRef.current?.click()} className="w-full h-12 rounded-xl px-4 flex items-center gap-3 text-sm" style={FIELD}>
            <FileImage size={18} style={{ color: 'var(--k-accent)' }} />{idPhoto ? idPhoto.name : 'Photo of your ID card or NIN slip'}
          </button>
        </div>
        <button onClick={() => void submit()} disabled={busy} className="mt-6 w-full h-[52px] rounded-2xl font-extrabold flex items-center justify-center gap-2" style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)', opacity: busy ? 0.7 : 1 }}>
          {busy ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : 'Submit for review'}
        </button>
      </div>
    </Shell>
  )
}