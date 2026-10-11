import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, CheckCircle, Store, FileText, CreditCard, Camera, AlertCircle, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { validateImageFile } from '@/lib/security'
import { openPaystackCheckout, generateRef } from '@/lib/paystack'
import { toast } from 'sonner'

const STEPS = ['Business Info', 'Identity', 'Documents', 'Payment']
const VERIFICATION_FEE = 3000 // ₦3,000

const ID_TYPES = [
  { value: 'nin', label: 'National ID (NIN)' },
  { value: 'bvn', label: 'Bank Verification Number (BVN)' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'intl_passport', label: 'International Passport' },
  { value: 'voters_card', label: "Voter's Card" },
]

const BUSINESS_TYPES = ['Sole Proprietor', 'Partnership', 'Limited Liability Company (LLC)', 'Enterprise', 'Cooperative']

export default function SellerVerification() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const idDocRef = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)
  const cacRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    state: '',
    city: '',
    store_name: '',
    store_address: '',
    business_type: '',
    cac_number: '',
    tax_id: '',
    id_type: '',
    id_number: '',
    id_document_url: '',
    selfie_url: '',
    cac_document_url: '',
    payment_ref: '',
  })

  const [uploads, setUploads] = useState({ id_doc: '', selfie: '', cac: '' })
  const [uploading, setUploading] = useState({ id_doc: false, selfie: false, cac: false })

  const uid = import.meta.env.DEV ? 'dev-super-admin-id' : user?.id

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const uploadFile = async (file: File, folder: string, key: 'id_doc' | 'selfie' | 'cac') => {
    const validation = await validateImageFile(file)
    if (!validation.ok) { toast.error(validation.error); return }
    setUploading(u => ({ ...u, [key]: true }))
    const ts = new Date().getTime()
    const path = `${folder}/${uid}/${ts}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
    const { error } = await supabase.storage.from('kasaja-media').upload(path, file, { upsert: true })
    if (error) { toast.error('Upload failed'); setUploading(u => ({ ...u, [key]: false })); return }
    const { data: { publicUrl } } = supabase.storage.from('kasaja-media').getPublicUrl(path)
    setUploads(u => ({ ...u, [key]: publicUrl }))
    const fieldMap = { id_doc: 'id_document_url', selfie: 'selfie_url', cac: 'cac_document_url' } as const
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
    const payload = {
      user_id: uid,
      type: 'seller',
      status: 'payment_pending',
      ...form,
      payment_ref: payRef,
      payment_amount: VERIFICATION_FEE,
    }
    const { error } = await supabase.from('verification_applications').insert(payload)
    setSaving(false)
    if (error) { toast.error('Submission failed. Please try again.'); return }
    setSubmitted(true)
  }

  const canNext = () => {
    if (step === 0) return form.full_name && form.phone && form.state && form.city && form.store_name && form.store_address && form.business_type
    if (step === 1) return form.id_type && form.id_number
    if (step === 2) return uploads.id_doc && uploads.selfie
    return false
  }

  if (submitted) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#080A0D' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'rgba(16,185,129,0.15)' }}>
        <CheckCircle size={40} className="text-emerald-400" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Application Submitted!</h1>
      <p className="text-white/60 mb-2">Your seller verification application is under review.</p>
      <p className="text-white/40 text-sm mb-8">We will notify you within 24–48 hours. Make sure your documents are clear and valid.</p>
      <div className="w-full max-w-sm p-4 rounded-2xl mb-6" style={{ background: '#11151A', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex justify-between text-sm mb-2"><span className="text-white/50">Application type</span><span className="text-white font-medium">Seller Verification</span></div>
        <div className="flex justify-between text-sm mb-2"><span className="text-white/50">Fee paid</span><span className="text-emerald-400 font-medium">₦{VERIFICATION_FEE.toLocaleString()}</span></div>
        <div className="flex justify-between text-sm"><span className="text-white/50">Status</span><span className="text-amber-400 font-medium">Under Review</span></div>
      </div>
      <button onClick={() => void navigate('/store/dashboard')} className="w-full max-w-sm py-3 rounded-2xl font-semibold text-white" style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)' }}>Go to Store Dashboard</button>
    </div>
  )

  return (
    <div className="min-h-screen pb-10" style={{ background: '#080A0D' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(8,10,13,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => step > 0 ? setStep(s => s - 1) : void navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#11151A' }}>
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white">Seller Verification</h1>
          <p className="text-xs text-white/40">Step {step + 1} of {STEPS.length}</p>
        </div>
        <div className="flex items-center gap-1">
          {STEPS.map((_, i) => (
            <div key={i} className="h-1.5 w-6 rounded-full transition-all" style={{ background: i <= step ? 'linear-gradient(90deg,#7C3AED,#06B6D4)' : 'rgba(255,255,255,0.12)' }} />
          ))}
        </div>
      </div>

      <div className="px-4 pt-6 max-w-lg mx-auto">
        {/* Step 0 — Business Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.15)' }}>
                <Store size={22} style={{ color: '#7C3AED' }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Business Information</h2>
                <p className="text-sm text-white/50">Tell us about your store</p>
              </div>
            </div>
            {[
              { label: 'Full Legal Name', key: 'full_name', placeholder: 'As on your ID document' },
              { label: 'Phone Number', key: 'phone', placeholder: '080XXXXXXXX' },
              { label: 'Store Name', key: 'store_name', placeholder: 'Your store/business name' },
              { label: 'Store Address', key: 'store_address', placeholder: 'Full address' },
              { label: 'State', key: 'state', placeholder: 'e.g. Lagos' },
              { label: 'City / LGA', key: 'city', placeholder: 'e.g. Ikeja' },
              { label: 'CAC Number (optional)', key: 'cac_number', placeholder: 'RC123456' },
              { label: 'Tax ID (optional)', key: 'tax_id', placeholder: 'TIN number if available' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">{f.label}</label>
                <input value={form[f.key as keyof typeof form]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} className="w-full px-4 py-3 rounded-2xl text-white text-sm outline-none focus:ring-2 focus:ring-violet-500" style={{ background: '#11151A', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">Business Type</label>
              <div className="grid grid-cols-2 gap-2">
                {BUSINESS_TYPES.map(t => (
                  <button key={t} onClick={() => set('business_type', t)} className="px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all" style={{ background: form.business_type === t ? 'rgba(124,58,237,0.2)' : '#11151A', border: `1px solid ${form.business_type === t ? '#7C3AED' : 'rgba(255,255,255,0.08)'}`, color: form.business_type === t ? '#a78bfa' : 'rgba(255,255,255,0.6)' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1 — Identity */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.15)' }}>
                <CreditCard size={22} style={{ color: '#06B6D4' }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Identity Verification</h2>
                <p className="text-sm text-white/50">Government-issued ID required</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">ID Type</label>
              <div className="space-y-2">
                {ID_TYPES.map(t => (
                  <button key={t.value} onClick={() => set('id_type', t.value)} className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all" style={{ background: form.id_type === t.value ? 'rgba(124,58,237,0.15)' : '#11151A', border: `1px solid ${form.id_type === t.value ? '#7C3AED' : 'rgba(255,255,255,0.08)'}` }}>
                    <span className="text-sm" style={{ color: form.id_type === t.value ? '#a78bfa' : 'rgba(255,255,255,0.7)' }}>{t.label}</span>
                    {form.id_type === t.value && <CheckCircle size={16} style={{ color: '#7C3AED' }} />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">ID Number</label>
              <input value={form.id_number} onChange={e => set('id_number', e.target.value)} placeholder="Enter your ID number" className="w-full px-4 py-3 rounded-2xl text-white text-sm outline-none focus:ring-2 focus:ring-violet-500" style={{ background: '#11151A', border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>
            <div className="p-4 rounded-2xl flex gap-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300/80">Your ID details are encrypted and used only for identity verification. We do not store raw ID numbers after verification.</p>
            </div>
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
                <p className="text-sm text-white/50">Clear photos required</p>
              </div>
            </div>

            {/* ID Document */}
            <div>
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">ID Document Photo</label>
              <input ref={idDocRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void uploadFile(f, 'verifications/id', 'id_doc') }} />
              <button onClick={() => idDocRef.current?.click()} className="w-full py-6 rounded-2xl flex flex-col items-center gap-2 transition-all" style={{ background: uploads.id_doc ? 'rgba(16,185,129,0.08)' : '#11151A', border: `2px dashed ${uploads.id_doc ? '#10B981' : 'rgba(255,255,255,0.12)'}` }}>
                {uploading.id_doc ? <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /> : uploads.id_doc ? <CheckCircle size={28} className="text-emerald-400" /> : <Upload size={28} className="text-white/30" />}
                <span className="text-sm" style={{ color: uploads.id_doc ? '#10B981' : 'rgba(255,255,255,0.4)' }}>{uploading.id_doc ? 'Uploading...' : uploads.id_doc ? 'Document uploaded ✓' : 'Tap to upload ID document'}</span>
                {!uploads.id_doc && <span className="text-xs text-white/25">JPG, PNG — max 5MB</span>}
              </button>
              {uploads.id_doc && <img src={uploads.id_doc} alt="ID" className="w-full h-32 object-cover rounded-xl mt-2" />}
            </div>

            {/* Selfie */}
            <div>
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">Selfie with ID</label>
              <input ref={selfieRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void uploadFile(f, 'verifications/selfie', 'selfie') }} />
              <button onClick={() => selfieRef.current?.click()} className="w-full py-6 rounded-2xl flex flex-col items-center gap-2 transition-all" style={{ background: uploads.selfie ? 'rgba(16,185,129,0.08)' : '#11151A', border: `2px dashed ${uploads.selfie ? '#10B981' : 'rgba(255,255,255,0.12)'}` }}>
                {uploading.selfie ? <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /> : uploads.selfie ? <CheckCircle size={28} className="text-emerald-400" /> : <Camera size={28} className="text-white/30" />}
                <span className="text-sm" style={{ color: uploads.selfie ? '#10B981' : 'rgba(255,255,255,0.4)' }}>{uploading.selfie ? 'Uploading...' : uploads.selfie ? 'Selfie uploaded ✓' : 'Take a selfie holding your ID'}</span>
              </button>
              {uploads.selfie && <img src={uploads.selfie} alt="Selfie" className="w-full h-32 object-cover rounded-xl mt-2" />}
            </div>

            {/* CAC (optional) */}
            <div>
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">CAC Certificate (optional)</label>
              <input ref={cacRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void uploadFile(f, 'verifications/cac', 'cac') }} />
              <button onClick={() => cacRef.current?.click()} className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-all" style={{ background: uploads.cac ? 'rgba(16,185,129,0.08)' : '#11151A', border: `1px dashed ${uploads.cac ? '#10B981' : 'rgba(255,255,255,0.1)'}` }}>
                {uploading.cac ? <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /> : <FileText size={16} style={{ color: uploads.cac ? '#10B981' : 'rgba(255,255,255,0.3)' }} />}
                <span className="text-sm" style={{ color: uploads.cac ? '#10B981' : 'rgba(255,255,255,0.4)' }}>{uploading.cac ? 'Uploading...' : uploads.cac ? 'CAC document uploaded ✓' : 'Upload CAC certificate'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Payment */}
        {step === 3 && (
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

            {/* Summary */}
            <div className="p-4 rounded-2xl space-y-3" style={{ background: '#11151A', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Application Summary</p>
              {[
                { label: 'Store Name', value: form.store_name },
                { label: 'Business Type', value: form.business_type },
                { label: 'ID Type', value: ID_TYPES.find(t => t.value === form.id_type)?.label ?? '' },
                { label: 'State', value: `${form.city}, ${form.state}` },
                { label: 'ID Photo', value: uploads.id_doc ? '✓ Uploaded' : '✗ Missing' },
                { label: 'Selfie', value: uploads.selfie ? '✓ Uploaded' : '✗ Missing' },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-white/50">{row.label}</span>
                  <span className="text-white font-medium">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Physical verification notice */}
            <div className="p-4 rounded-2xl space-y-2" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🏪</span>
                <p className="text-sm font-bold text-amber-300">Physical Store Verification Required</p>
              </div>
              <p className="text-xs text-amber-200/70 leading-relaxed">
                A <span className="text-amber-300 font-semibold">KASAJA agent</span> will be assigned to visit your store location for a physical inspection before your verification badge is approved. Please ensure your store address is accurate and someone will be available to receive the agent.
              </p>
              <div className="pt-1 space-y-1">
                {['Agent visit scheduled within 3–5 business days after payment', 'You will receive an SMS and in-app notification before the visit', 'Ensure your store signage, products, and CAC documents are available', 'Badge issued within 24 hours of successful physical inspection'].map(item => (
                  <div key={item} className="flex items-start gap-2">
                    <span className="text-amber-400 text-xs mt-0.5">•</span>
                    <p className="text-xs text-amber-200/60">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Fee */}
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-white font-semibold">Verification Fee</p>
                  <p className="text-xs text-white/40 mt-0.5">One-time, non-refundable</p>
                </div>
                <p className="text-2xl font-bold" style={{ color: '#a78bfa' }}>₦{VERIFICATION_FEE.toLocaleString()}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl flex gap-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-300/80">Payment is processed securely via Paystack. Your badge will appear after admin review and physical inspection.</p>
            </div>

            <button onClick={handlePayment} disabled={saving} className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95" style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Processing...' : `Pay ₦${VERIFICATION_FEE.toLocaleString()} & Submit`}
            </button>
          </div>
        )}

        {/* Next button */}
        {step < 3 && (
          <button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="w-full mt-8 py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95" style={{ background: canNext() ? 'linear-gradient(135deg,#7C3AED,#06B6D4)' : 'rgba(255,255,255,0.08)', opacity: canNext() ? 1 : 0.5 }}>
            Continue <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
