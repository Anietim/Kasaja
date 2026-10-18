import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ShoppingBag, Store, Bike, Loader2, Camera, ArrowRight, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { normalisePhone } from '@/lib/auth'
import { PRODUCT_CATEGORIES } from '@/lib/utils'
import { NG_AREAS } from '@/lib/ngAreas'

const NG_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara',
]

const ROLES = [
  { id: 'buyer',  title: 'Buyer',  desc: 'Shop from sellers and markets across Nigeria.', icon: ShoppingBag },
  { id: 'seller', title: 'Seller', desc: 'Open a store, list products, receive orders.',  icon: Store },
  { id: 'independent', title: 'Independent Shopper', desc: 'Sell anything without a shop. Verified before you can list.', icon: Store },
  { id: 'rider',  title: 'Rider',  desc: 'Deliver orders and earn.',                       icon: Bike },
]

const VEHICLES = ['Motorcycle', 'Bicycle', 'Tricycle (Keke)', 'Car', 'Van']

const INTERESTS = [
  'Fashion & Clothing', 'Electronics', 'Phones & Accessories', 'Food & Groceries',
  'Beauty & Skincare', 'Furniture & Home', 'Auto Parts', 'Sports & Fitness',
  'Books & Education', 'Baby & Kids', 'Agriculture', 'Jewelry & Accessories',
]

type StepKey = 'role' | 'about' | 'buyer' | 'seller' | 'rider'

const inputCls =
  'w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 transition-colors'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="text-sm text-neutral-300 mb-1 block">{label}</span>
      {children}
      {hint && <span className="text-xs text-neutral-500 mt-1 block">{hint}</span>}
    </label>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step: role
  const [roles, setRoles] = useState<string[]>(['buyer'])

  // Step: about you
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Step: buyer
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [interests, setInterests] = useState<string[]>([])

  // Step: seller
  const [storeName, setStoreName] = useState('')
  const [storeCategory, setStoreCategory] = useState('')
  const [storeDescription, setStoreDescription] = useState('')
  const [storeAddress, setStoreAddress] = useState('')
  const [storePhone, setStorePhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [bankName, setBankName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')

  // Step: rider
  const [vehicle, setVehicle] = useState('')
  const [plate, setPlate] = useState('')
  const [serviceArea, setServiceArea] = useState('')

  const steps: StepKey[] = [
    'role',
    'about',
    ...(roles.includes('buyer') ? (['buyer'] as StepKey[]) : []),
    ...(roles.includes('seller') ? (['seller'] as StepKey[]) : []),
    ...(roles.includes('rider') ? (['rider'] as StepKey[]) : []),
  ]
  const current = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

    function toggleRole(id: string) {
    setRoles([id])
  }

  function toggleInterest(name: string) {
    setInterests(prev =>
      prev.includes(name) ? prev.filter(i => i !== name) : prev.length < 6 ? [...prev, name] : prev,
    )
  }

  function pickImage(e: React.ChangeEvent<HTMLInputElement>, kind: 'avatar' | 'logo') {
    const f = e.target.files?.[0]
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { toast.error('Use a JPEG, PNG or WebP image'); return }
    if (f.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    if (kind === 'avatar') { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) }
    else { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)) }
  }

  function validPhone(raw: string): boolean {
    return /^\+234\d{10}$/.test(normalisePhone(raw))
  }

  function validate(step: StepKey): string | null {
    if (step === 'about') {
      if (fullName.trim().split(/\s+/).filter(Boolean).length < 2) return 'Enter your full name (first and last name)'
      if (!validPhone(phone)) return 'Enter a valid Nigerian phone number, e.g. 0803 123 4567'
      if (!state) return 'Select your state'
      if (!city.trim()) return 'Enter your city or area'
    }
    if (step === 'seller') {
      if (!storeName.trim()) return 'Enter your store name'
      if (!storeCategory) return 'Select a store category'
      if (!storeAddress.trim()) return 'Enter your store address'
      if (storePhone.trim() && !validPhone(storePhone)) return 'Store phone number looks wrong'
      if (whatsapp.trim() && !validPhone(whatsapp)) return 'WhatsApp number looks wrong'
      if (bankAccountNumber.trim() && !/^\d{10}$/.test(bankAccountNumber.trim())) return 'Account number must be 10 digits'
    }
    if (step === 'rider') {
      if (!vehicle) return 'Select your vehicle type'
      if (!serviceArea.trim()) return 'Tell us which areas you cover'
    }
    return null
  }

  async function uploadImage(file: File, path: string): Promise<string | null> {
    const { error } = await supabase.storage.from('kasaja-media').upload(path, file, { upsert: true })
    if (error) { toast.error('Image upload failed: ' + error.message); return null }
    return supabase.storage.from('kasaja-media').getPublicUrl(path).data.publicUrl
  }

  async function finish() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Session expired. Please sign in again.'); void navigate('/login'); return }
      const uid = user.id

      let avatarUrl: string | null = null
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() ?? 'jpg'
        avatarUrl = await uploadImage(avatarFile, `avatars/${uid}.${ext}`)
      }

      // 1. Profile
      const profileRow: Record<string, unknown> = {
        id: uid,
        display_name: fullName.trim(),
        phone: normalisePhone(phone),
        roles: roles.includes('independent') ? Array.from(new Set([...roles, 'buyer'])) : roles,
        state,
        city: city.trim(),
        interests,
      }
      if (deliveryAddress.trim()) profileRow.address = deliveryAddress.trim()
      if (avatarUrl) profileRow.avatar_url = avatarUrl

      const { error: pErr } = await supabase.from('profiles').upsert(profileRow)
      if (pErr) {
        toast.error(pErr.code === '23505' ? 'That phone number is already used by another account' : pErr.message)
        return
      }

      // 2. Store (sellers)
      if (roles.includes('seller')) {
        let logoUrl: string | null = null
        if (logoFile) {
          const ext = logoFile.name.split('.').pop() ?? 'jpg'
          logoUrl = await uploadImage(logoFile, `store-logos/${uid}/${Date.now()}.${ext}`)
        }
        const storeRow: Record<string, unknown> = {
          owner_id: uid,
          name: storeName.trim(),
          category: storeCategory,
          description: storeDescription.trim() || null,
          address: storeAddress.trim(),
          state,
          phone: storePhone.trim() ? normalisePhone(storePhone) : normalisePhone(phone),
          whatsapp: whatsapp.trim() ? normalisePhone(whatsapp) : null,
          bank_name: bankName.trim() || null,
          bank_account_number: bankAccountNumber.trim() || null,
          bank_account_name: bankAccountName.trim() || null,
        }
        if (logoUrl) storeRow.logo_url = logoUrl

        const { data: existing } = await supabase.from('stores').select('id').eq('owner_id', uid).limit(1)
        const { error: sErr } = existing && existing.length > 0
          ? await supabase.from('stores').update(storeRow).eq('id', existing[0].id)
          : await supabase.from('stores').insert(storeRow)
        if (sErr) { toast.error('Could not save your store: ' + sErr.message); return }
      }

      // 3. Rider details
      if (roles.includes('rider')) {
        const { error: rErr } = await supabase.from('rider_profiles').upsert({
          id: uid,
          vehicle_type: vehicle.toLowerCase(),
          vehicle_plate: plate.trim() || null,
          service_area: serviceArea.trim(),
        })
        if (rErr) { toast.error('Could not save rider details: ' + rErr.message); return }
      }

      // 4. Mark finished (last, so a failed step above lets the user retry)
      const { error: dErr } = await supabase.from('profiles').update({ onboarding_done: true }).eq('id', uid)
      if (dErr) { toast.error(dErr.message); return }

      toast.success('Welcome to KASAJA!')
      void navigate('/home')
    } finally {
      setSaving(false)
    }
  }

  function next() {
    const problem = validate(current)
    if (problem) { toast.error(problem); return }
    if (isLast) { void finish(); return }
    setStepIndex(i => i + 1)
  }

  const titles: Record<StepKey, string> = {
    role: 'How will you use KASAJA?',
    about: 'Tell us about you',
    buyer: 'Your shopping details',
    seller: 'Set up your store',
    rider: 'Your delivery details',
  }

  return (
    <div className="min-h-dvh bg-canvas flex flex-col px-6 py-10 max-w-sm mx-auto">
      <div className="flex gap-1.5 mb-6">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-brand-500' : 'bg-surface-800'}`} />
        ))}
      </div>
      <p className="text-xs text-neutral-500 mb-1">Step {stepIndex + 1} of {steps.length}</p>
      <h1 className="font-display text-2xl font-bold text-white mb-6 tracking-tight">{titles[current]}</h1>

      <div className="flex-1">
        {current === 'role' && (
          <div className="space-y-3">
            <p className="text-neutral-400 text-sm mb-2">Choose one. Independent Shoppers can also buy.</p>
            {ROLES.map(r => {
              const Icon = r.icon
              const on = roles.includes(r.id)
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleRole(r.id)}
                  className={`w-full text-left rounded-2xl border p-4 flex items-start gap-3 transition-colors ${
                    on ? 'border-brand-500 bg-brand-500/10' : 'border-surface-700 bg-surface-800'
                  }`}
                >
                  <Icon className={on ? 'text-brand-500' : 'text-neutral-400'} size={22} />
                  <span>
                    <span className="block text-white font-semibold">{r.title}</span>
                    <span className="block text-neutral-400 text-sm">{r.desc}</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {current === 'about' && (
          <div>
            <div className="flex flex-col items-center mb-5">
              <label className="w-20 h-20 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center overflow-hidden cursor-pointer">
                {avatarPreview
                  ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                  : <Camera className="text-neutral-500" size={24} />}
                <input type="file" accept="image/*" className="hidden" onChange={e => pickImage(e, 'avatar')} />
              </label>
              <span className="text-xs text-neutral-500 mt-2">Profile photo (optional)</span>
            </div>
            <Field label="Full name">
              <input className={inputCls} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Adaeze Okafor" />
            </Field>
            <Field label="Phone number" hint="Buyers, sellers and riders use this to reach you">
              <input className={inputCls} inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0803 123 4567" />
            </Field>
            <Field label="State">
              <select className={inputCls} value={state} onChange={e => { setState(e.target.value); setCity('') }}>
                <option value="">Select state</option>
                {NG_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
                        <Field label="City / area">
              {NG_AREAS[state] ? (
                <select className={inputCls} value={city} onChange={e => setCity(e.target.value)}>
                  <option value="">Select your area</option>
                  {NG_AREAS[state].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              ) : (
                <input className={inputCls} value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Ikeja" />
              )}
            </Field>
          </div>
        )}

        {current === 'buyer' && (
          <div>
            <Field label="Delivery address (optional)" hint="You can change this at checkout">
              <input className={inputCls} value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="House number, street, area" />
            </Field>
            <p className="text-sm text-neutral-300 mb-2">What do you like to shop for? (up to 6, optional)</p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleInterest(i)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    interests.includes(i) ? 'border-brand-500 bg-brand-500/15 text-white' : 'border-surface-700 text-neutral-400'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        )}

        {current === 'seller' && (
          <div>
            <div className="flex flex-col items-center mb-5">
              <label className="w-20 h-20 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center overflow-hidden cursor-pointer">
                {logoPreview
                  ? <img src={logoPreview} alt="" className="w-full h-full object-cover" />
                  : <Store className="text-neutral-500" size={24} />}
                <input type="file" accept="image/*" className="hidden" onChange={e => pickImage(e, 'logo')} />
              </label>
              <span className="text-xs text-neutral-500 mt-2">Store logo (optional)</span>
            </div>
            <Field label="Store name">
              <input className={inputCls} value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="e.g. Adaeze Fashion House" />
            </Field>
            <Field label="Category">
              <select className={inputCls} value={storeCategory} onChange={e => setStoreCategory(e.target.value)}>
                <option value="">Select category</option>
                {PRODUCT_CATEGORIES.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="About your store (optional)">
              <textarea className={inputCls} rows={3} value={storeDescription} onChange={e => setStoreDescription(e.target.value)} placeholder="What do you sell?" />
            </Field>
            <Field label="Store address">
              <input className={inputCls} value={storeAddress} onChange={e => setStoreAddress(e.target.value)} placeholder="e.g. Shop 22, Balogun Market, Lagos Island" />
            </Field>
            <Field label="Store phone (optional)" hint="Leave empty to use your personal number">
              <input className={inputCls} inputMode="tel" value={storePhone} onChange={e => setStorePhone(e.target.value)} />
            </Field>
            <Field label="WhatsApp number (optional)">
              <input className={inputCls} inputMode="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
            </Field>
            <p className="text-sm text-neutral-300 mb-1">Payout bank account (optional, can be added later)</p>
            <Field label="Bank name">
              <input className={inputCls} value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. GTBank" />
            </Field>
            <Field label="Account number">
              <input className={inputCls} inputMode="numeric" maxLength={10} value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value.replace(/\D/g, ''))} />
            </Field>
            <Field label="Account name">
              <input className={inputCls} value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} />
            </Field>
          </div>
        )}

        {current === 'rider' && (
          <div>
            <Field label="Vehicle type">
              <select className={inputCls} value={vehicle} onChange={e => setVehicle(e.target.value)}>
                <option value="">Select vehicle</option>
                {VEHICLES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Plate number (optional)">
              <input className={inputCls} value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="e.g. LSR-123-AB" />
            </Field>
            <Field label="Areas you cover" hint="e.g. Ikeja, Maryland, Yaba">
              <input className={inputCls} value={serviceArea} onChange={e => setServiceArea(e.target.value)} />
            </Field>
            <p className="text-xs text-neutral-500">
              ID and vehicle documents are collected later, when you apply for rider verification.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-8">
        {stepIndex > 0 && (
          <button
            type="button"
            onClick={() => setStepIndex(i => i - 1)}
            disabled={saving}
            className="px-5 py-3.5 rounded-xl bg-surface-800 text-neutral-300 flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <button
          type="button"
          onClick={next}
          disabled={saving}
          className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          {saving
            ? <Loader2 className="animate-spin" size={18} />
            : isLast ? 'Finish' : <>Continue <ArrowRight size={16} /></>}
        </button>
      </div>
    </div>
  )
}