import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, CheckCircle, Bike, FileText, Camera, AlertCircle, ChevronRight, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { validateImageFile } from '@/lib/security'
import { openPaystackCheckout, generateRef } from '@/lib/paystack'
import { toast } from 'sonner'

const STEPS = ['Personal Info', 'Vehicle Info', 'Documents', 'Guarantor', 'Payment']
const VERIFICATION_FEE = 1000 // ₦1,000

const VEHICLE_TYPES = [
  { value: 'motorcycle', label: 'Motorcycle', icon: '🏍️' },
  { value: 'bicycle', label: 'Bicycle', icon: '🚲' },
  { value: 'car', label: 'Car', icon: '🚗' },
  { value: 'van', label: 'Van / Minibus', icon: '🚐' },
  { value: 'truck', label: 'Truck / Pickup', icon: '🚚' },
  { value: 'keke', label: 'Keke (Tricycle)', icon: '🛺' },
]

const ID_TYPES = [
  { value: 'nin', label: 'National ID (NIN)' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'intl_passport', label: 'International Passport' },
  { value: 'voters_card', label: "Voter's Card" },
]

export default function RiderVerification() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const idDocRef = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)
  const vehicleDocRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    full_name: '', phone: '', state: '', city: '',
    id_type: '', id_number: '',
    vehicle_type: '', vehicle_make: '', vehicle_model: '', plate_number: '',
    guarantor_name: '', guarantor_phone: '', guarantor_address: '',
    id_document_url: '', selfie_url: '', vehicle_document_url: '',
    payment_ref: '',
  })

  const [uploads, setUploads] = useState({ id_doc: '', selfie: '', vehicle_doc: '' })
  const [uploading, setUploading] = useState({ id_doc: false, selfie: false, vehicle_doc: false })

  const uid = import.meta.env.DEV ? 'dev-super-admin-id' : user?.id

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const uploadFile = async (file: File, folder: string, key: 'id_doc' | 'selfie' | 'vehicle_doc') => {
    const validation = await validateImageFile(file)
    if (!validation.ok) { toast.error(validation.error); return }
    setUploading(u => ({ ...u, [key]: true }))
    const ts = new Date().getTime()
    const path = `${folder}/${uid}/${ts}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
    const { error } = await supabase.storage.from('kasaja-media').upload(path, file, { upsert: true })
    if (error) { toast.error('Upload failed'); setUploading(u => ({ ...u, [key]: false })); return }
    const { data: { publicUrl } } = supabase.storage.from('kasaja-media').getPublicUrl(path)
    setUploads(u => ({ ...u, [key]: publicUrl }))
    const fieldMap = { id_doc: 'id_document_url', selfie: 'selfie_url', vehicle_doc: 'vehicle_document_url' } as const
    set(fieldMap[key], publicUrl)
    setUploading(u => ({ ...u, [key]: false }))
    toast.success('Document uploaded')
  }

  const handlePayment = () => {
    const ref = generateRef()
    void openPaystackCheckout({
      email: user?.email ?? 'dev@kasaja.ng',
      amount: VERIFICATION_FEE,
      ref,
      onClose: () => toast.error('Payment cancelled'),
      callback: () => { void (async () => { set('payment_ref', ref); await submitApplication(ref) })() },
    })
  }

  const submitApplication = async (payRef: string) => {
    setSaving(true)
    const { error } = await supabase.from('verification_applications').insert({
      user_id: uid, type: 'rider', status: 'payment_pending', ...form,
      payment_ref: payRef, payment_amount: VERIFICATION_FEE,
    })
    setSaving(false)
    if (error) { toast.error('Submission failed. Please try again.'); return }
    setSubmitted(true)
  }

  const canNext = () => {
    if (step === 0) return form.full_name && form.phone && form.state && form.city && form.id_type && form.id_number
    if (step === 1) return form.vehicle_type && form.plate_number
    if (step === 2) return uploads.id_doc && uploads.selfie
    if (step === 3) return form.guarantor_name && form.guarantor_phone
    return false
  }

  if (submitted) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#080A0D' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'rgba(16,185,129,0.15)' }}>
        <CheckCircle size={40} className="text-emerald-400" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Application Submitted!</h1>
      <p className="text-white/60 mb-2">Your rider verification application is under review.</p>
      <p className="text-white/40 text-sm mb-8">You will be notified within 24–48 hours once approved.</p>
      <div className="w-full max-w-sm p-4 rounded-2xl mb-6" style={{ background: '#11151A', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex justify-between text-sm mb-2"><span className="text-white/50">Application type</span><span className="text-white font-medium">Rider Verification</span></div>
        <div className="flex justify-between text-sm mb-2"><span className="text-white/50">Fee paid</span><span className="text-emerald-400 font-medium">₦{VERIFICATION_FEE.toLocaleString()}</span></div>
        <div className="flex justify-between text-sm"><span className="text-white/50">Status</span><span className="text-amber-400 font-medium">Under Review</span></div>
      </div>
      <button onClick={() => void navigate('/rider')} className="w-full max-w-sm py-3 rounded-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)' }}>Go to Rider Dashboard</button>
    </div>
  )

  return (
    <div className="min-h-screen pb-10" style={{ background: '#080A0D' }}>
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(8,10,13,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => step > 0 ? setStep(s => s - 1) : void navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#11151A' }}>
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white">Rider Verification</h1>
          <p className="text-xs text-white/40">Step {step + 1} of {STEPS.length}</p>
        </div>
        <div className="flex items-center gap-1">
          {STEPS.map((_, i) => (
            <div key={i} className="h-1.5 w-5 rounded-full transition-all" style={{ background: i <= step ? 'linear-gradient(90deg,#7C3AED,#06B6D4)' : 'rgba(255,255,255,0.12)' }} />
          ))}
        </div>
      </div>

      <div className="px-4 pt-6 max-w-lg mx-auto">
        {/* Step 0 — Personal Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.15)' }}>
                <User size={22} style={{ color: '#7C3AED' }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Personal Information</h2>
                <p className="text-sm text-white/50">Basic details and identity</p>
              </div>
            </div>
            {[
              { label: 'Full Legal Name', key: 'full_name', placeholder: 'As on your ID document' },
              { label: 'Phone Number', key: 'phone', placeholder: '080XXXXXXXX' },
              { label: 'State of Residence', key: 'state', placeholder: 'e.g. Lagos' },
              { label: 'City / LGA', key: 'city', placeholder: 'e.g. Yaba' },
              { label: 'ID Number', key: 'id_number', placeholder: 'Enter your ID number' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">{f.label}</label>
                <input value={form[f.key as keyof typeof form]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} className="w-full px-4 py-3 rounded-2xl text-white text-sm outline-none focus:ring-2 focus:ring-violet-500" style={{ background: '#11151A', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">ID Type</label>
              <div className="grid grid-cols-2 gap-2">
                {ID_TYPES.map(t => (
                  <button key={t.value} onClick={() => set('id_type', t.value)} className="px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all" style={{ background: form.id_type === t.value ? 'rgba(124,58,237,0.2)' : '#11151A', border: `1px solid ${form.id_type === t.value ? '#7C3AED' : 'rgba(255,255,255,0.08)'}`, color: form.id_type === t.value ? '#a78bfa' : 'rgba(255,255,255,0.6)' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1 — Vehicle */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.15)' }}>
                <Bike size={22} style={{ color: '#06B6D4' }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Vehicle Information</h2>
                <p className="text-sm text-white/50">Your delivery vehicle details</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">Vehicle Type</label>
              <div className="grid grid-cols-3 gap-2">
                {VEHICLE_TYPES.map(v => (
                  <button key={v.value} onClick={() => set('vehicle_type', v.value)} className="py-3 px-2 rounded-xl flex flex-col items-center gap-1 transition-all" style={{ background: form.vehicle_type === v.value ? 'rgba(124,58,237,0.2)' : '#11151A', border: `1px solid ${form.vehicle_type === v.value ? '#7C3AED' : 'rgba(255,255,255,0.08)'}` }}>
                    <span className="text-xl">{v.icon}</span>
                    <span className="text-xs" style={{ color: form.vehicle_type === v.value ? '#a78bfa' : 'rgba(255,255,255,0.6)' }}>{v.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {[
              { label: 'Vehicle Make', key: 'vehicle_make', placeholder: 'e.g. Honda, Toyota' },
              { label: 'Vehicle Model', key: 'vehicle_model', placeholder: 'e.g. CBR, Camry' },
              { label: 'Plate Number', key: 'plate_number', placeholder: 'e.g. ABC-123-XY' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">{f.label}</label>
                <input value={form[f.key as keyof typeof form]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} className="w-full px-4 py-3 rounded-2xl text-white text-sm outline-none focus:ring-2 focus:ring-violet-500" style={{ background: '#11151A', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
            ))}
          </div>
        )}

        {/* Step 2 — Documents */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(236,72,153,0.15)' }}>
                <FileText size={22} style={{ color: '#EC4899' }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Upload Documents</h2>
                <p className="text-sm text-white/50">Clear photos of all documents</p>
              </div>
            </div>
            {[
              { key: 'id_doc' as const, ref: idDocRef, label: 'ID Document Photo', icon: <Upload size={28} />, capture: undefined },
              { key: 'selfie' as const, ref: selfieRef, label: 'Selfie Holding ID', icon: <Camera size={28} />, capture: 'user' as const },
              { key: 'vehicle_doc' as const, ref: vehicleDocRef, label: 'Vehicle/Insurance Document', icon: <FileText size={28} />, capture: undefined },
            ].map(doc => (
              <div key={doc.key}>
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">{doc.label}</label>
                <input ref={doc.ref} type="file" accept="image/*" capture={doc.capture} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void uploadFile(f, `verifications/${doc.key}`, doc.key) }} />
                <button onClick={() => doc.ref.current?.click()} className="w-full py-5 rounded-2xl flex flex-col items-center gap-2 transition-all" style={{ background: uploads[doc.key] ? 'rgba(16,185,129,0.08)' : '#11151A', border: `2px dashed ${uploads[doc.key] ? '#10B981' : 'rgba(255,255,255,0.12)'}` }}>
                  <span style={{ color: uploads[doc.key] ? '#10B981' : 'rgba(255,255,255,0.3)' }}>{uploading[doc.key] ? <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /> : uploads[doc.key] ? <CheckCircle size={28} /> : doc.icon}</span>
                  <span className="text-sm" style={{ color: uploads[doc.key] ? '#10B981' : 'rgba(255,255,255,0.4)' }}>{uploading[doc.key] ? 'Uploading...' : uploads[doc.key] ? `${doc.label} ✓` : `Tap to upload`}</span>
                </button>
                {uploads[doc.key] && <img src={uploads[doc.key]} alt={doc.label} className="w-full h-28 object-cover rounded-xl mt-2" />}
              </div>
            ))}
          </div>
        )}

        {/* Step 3 — Guarantor */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.15)' }}>
                <User size={22} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Guarantor Details</h2>
                <p className="text-sm text-white/50">Someone who can vouch for you</p>
              </div>
            </div>
            <div className="p-3 rounded-xl flex gap-2 mb-2" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <AlertCircle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300/80">A guarantor is required for all riders. They confirm your identity and take responsibility if disputes arise during deliveries.</p>
            </div>
            {[
              { label: 'Guarantor Full Name', key: 'guarantor_name', placeholder: 'Full name' },
              { label: 'Guarantor Phone', key: 'guarantor_phone', placeholder: '080XXXXXXXX' },
              { label: 'Guarantor Address', key: 'guarantor_address', placeholder: 'Full residential address' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">{f.label}</label>
                <input value={form[f.key as keyof typeof form]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} className="w-full px-4 py-3 rounded-2xl text-white text-sm outline-none focus:ring-2 focus:ring-violet-500" style={{ background: '#11151A', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
            ))}
          </div>
        )}

        {/* Step 4 — Payment */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <CheckCircle size={22} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Review & Pay</h2>
                <p className="text-sm text-white/50">One-time verification fee</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl space-y-3" style={{ background: '#11151A', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Summary</p>
              {[
                { label: 'Full Name', value: form.full_name },
                { label: 'Vehicle', value: `${form.vehicle_make} ${form.vehicle_model} (${form.plate_number})`.trim() || 'Not specified' },
                { label: 'Vehicle Type', value: VEHICLE_TYPES.find(v => v.value === form.vehicle_type)?.label ?? '' },
                { label: 'Guarantor', value: form.guarantor_name },
                { label: 'Documents', value: uploads.id_doc && uploads.selfie ? '✓ All uploaded' : '⚠ Check uploads' },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-white/50">{row.label}</span>
                  <span className="text-white font-medium">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-white font-semibold">Verification Fee</p>
                  <p className="text-xs text-white/40 mt-0.5">One-time, non-refundable</p>
                </div>
                <p className="text-2xl font-bold" style={{ color: '#a78bfa' }}>₦{VERIFICATION_FEE.toLocaleString()}</p>
              </div>
            </div>
            <button onClick={handlePayment} disabled={saving} className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95" style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Processing...' : `Pay ₦${VERIFICATION_FEE.toLocaleString()} & Submit`}
            </button>
          </div>
        )}

        {step < 4 && (
          <button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="w-full mt-8 py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95" style={{ background: canNext() ? 'linear-gradient(135deg,#7C3AED,#06B6D4)' : 'rgba(255,255,255,0.08)', opacity: canNext() ? 1 : 0.5 }}>
            Continue <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
