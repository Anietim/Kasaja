import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, Upload, Store } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { PRODUCT_CATEGORIES } from '../../lib/utils'
import type { UserRole } from '../../types/database'

export default function OnboardSeller() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state: { roles: UserRole[]; interests: string[]; display_name?: string } }
  const fileRef = useRef<HTMLInputElement>(null)

  const [storeName,  setStoreName]  = useState('')
  const [category,   setCategory]   = useState('')
  const [location,   setLocation]   = useState('')
  const [logoFile,   setLogoFile]   = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)

  function pickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setLogoFile(f)
    setLogoPreview(URL.createObjectURL(f))
  }

  async function finish() {
    if (!storeName.trim()) { toast.error('Enter your store name'); return }
    if (!category)         { toast.error('Select a category'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { void navigate('/login'); return }

    let logoUrl: string | null = null
    if (logoFile) {
      const { data: upload, error: upErr } = await supabase.storage
        .from('store-logos')
        .upload(`${user.id}/${Date.now()}_logo`, logoFile, { upsert: true })
      if (upErr) { toast.error('Logo upload failed: ' + upErr.message) }
      else {
        const { data: { publicUrl } } = supabase.storage.from('store-logos').getPublicUrl(upload.path)
        logoUrl = publicUrl
      }
    }

    // Upsert profile with display name if from first onboarding
    await supabase.from('profiles').upsert({
      id:           user.id,
      roles:        state?.roles ?? ['seller'],
      display_name: state?.display_name || storeName,
      status:       'active',
    })

    const { error } = await supabase.from('stores').insert({
      owner_id:      user.id,
      name:          storeName.trim(),
      category,
      location_text: location.trim() || null,
      logo_url:      logoUrl,
    })

    setLoading(false)
    if (error) { toast.error(error.message); return }

    if (state?.roles?.includes('rider')) {
      void navigate('/onboard/rider', { state })
    } else {
      toast.success('Store created! Welcome to KASAJA.')
      void navigate('/home')
    }
  }

  return (
    <div className="min-h-dvh bg-canvas flex flex-col px-6 py-16 max-w-sm mx-auto">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
            <Store size={20} className="text-brand-500" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white tracking-tight">Set up your store</h1>
            <p className="text-neutral-400 text-sm">Tell buyers about your business</p>
          </div>
        </div>

        {/* Logo picker */}
        <div className="flex flex-col items-center mb-6">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-24 h-24 rounded-2xl border-2 border-dashed border-surface-border
              flex flex-col items-center justify-center gap-1 transition hover:border-brand-500 overflow-hidden"
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Store logo" className="w-full h-full object-cover" />
            ) : (
              <>
                <Upload size={20} className="text-neutral-500" />
                <span className="text-xs text-neutral-500">Logo</span>
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickLogo} />
          <p className="text-xs text-neutral-500 mt-1">Tap to add store logo</p>
        </div>

        <label className="block mb-4">
          <span className="text-sm text-neutral-400 mb-1 block">Store name</span>
          <input type="text" placeholder="e.g. Adaeze Fashion House"
            value={storeName} onChange={e => setStoreName(e.target.value)}
            className="w-full bg-surface border border-surface-border text-white rounded-2xl
              px-4 py-4 text-base font-body outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition"
          />
        </label>

        <label className="block mb-4">
          <span className="text-sm text-neutral-400 mb-1 block">Category</span>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full bg-surface border border-surface-border text-white rounded-2xl
              px-4 py-4 text-base font-body outline-none focus:border-brand-500 transition appearance-none"
          >
            <option value="">Select category</option>
            {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label className="block mb-8">
          <span className="text-sm text-neutral-400 mb-1 block">Store location (optional)</span>
          <input type="text" placeholder="e.g. Shop 22, Balogun Market, Lagos Island"
            value={location} onChange={e => setLocation(e.target.value)}
            className="w-full bg-surface border border-surface-border text-white rounded-2xl
              px-4 py-4 text-base font-body outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition"
          />
        </label>

        <button onClick={() => void finish()} disabled={loading}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-40
            text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Create my store'}
        </button>
      </motion.div>
    </div>
  )
}
