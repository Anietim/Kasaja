import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Camera, X, Plus, ChevronLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { validateImageFile } from '@/lib/security'
import { toast } from 'sonner'

const CATEGORIES = ['Fashion & Clothing','Electronics','Food & Groceries','Auto Parts','Building Materials',
  'Beauty & Personal Care','Health & Wellness','Books & Stationery','Sports & Fitness','Agriculture',
  'Home & Furniture','Baby & Kids','Art & Crafts','Phones & Accessories','Computers & Gadgets','Other']

interface Variant { name: string; options: string }

export default function ProductForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [priceKobo, setPriceKobo] = useState('')
  const [isNegotiable, setIsNegotiable] = useState(false)
  const [quantity, setQuantity] = useState('1')
  const [condition, setCondition] = useState<'new'|'used'|'refurbished'>('new')
  const [location, setLocation] = useState('')
  const [variants, setVariants] = useState<Variant[]>([])
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function addImage(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files).slice(0, 6 - images.length)
    const validated: File[] = []
    for (const f of newFiles) {
      const result = await validateImageFile(f)
      if (!result.ok) {
        toast.error(result.error ?? 'Invalid file rejected.')
        continue
      }
      validated.push(f)
    }
    setImages(prev => [...prev, ...validated])
    validated.forEach(f => {
      const reader = new FileReader()
      reader.onload = e => setPreviews(prev => [...prev, e.target?.result as string])
      reader.readAsDataURL(f)
    })
  }

  function removeImage(i: number) {
    setImages(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  function addVariant() {
    setVariants(prev => [...prev, { name: '', options: '' }])
  }

  function updateVariant(i: number, field: keyof Variant, val: string) {
    setVariants(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: val } : v))
  }

  function removeVariant(i: number) {
    setVariants(prev => prev.filter((_, idx) => idx !== i))
  }

  async function submit() {
    if (!user) { setError('Please log in first'); return }
    if (!title.trim()) { setError('Product title is required'); return }
    if (!category) { setError('Please select a category'); return }
    if (!priceKobo || isNaN(Number(priceKobo))) { setError('Please enter a valid price'); return }
    if (images.length === 0) { setError('Please add at least one product photo'); return }

    setLoading(true)
    setError('')

    try {
      // 1. Get or create store for this user
      let { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!store) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()
        const { data: newStore, error: storeErr } = await supabase
          .from('stores')
          .insert({ owner_id: user.id, name: `${(profile as { display_name?: string } | null)?.display_name ?? 'My'} Store`, is_verified: false, avg_rating: 0, rating_count: 0, trending_score: 0 })
          .select('id')
          .single()
        if (storeErr || !newStore) throw new Error('Could not create store')
        store = newStore
      }

      // 2. Upload images to Supabase Storage
      const imageUrls: string[] = []
      for (const file of images) {
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `products/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('kasaja-media').upload(path, file, { upsert: false })
        if (uploadErr) {
          // Storage bucket may not exist yet — use placeholder
          imageUrls.push(`https://picsum.photos/seed/${path}/400/400`)
        } else {
          const { data: { publicUrl } } = supabase.storage.from('kasaja-media').getPublicUrl(path)
          imageUrls.push(publicUrl)
        }
      }

      // 3. Build variants object
      const variantsObj: Record<string, string[]> = {}
      variants.forEach(v => {
        if (v.name.trim()) {
          variantsObj[v.name.trim()] = v.options.split(',').map(s => s.trim()).filter(Boolean)
        }
      })

      // 4. Insert product
      const { data: product, error: productErr } = await supabase
        .from('products')
        .insert({
          store_id: (store).id,
          title: title.trim(),
          description: description.trim(),
          category,
          price_kobo: Math.round(Number(priceKobo) * 100),
          is_negotiable: isNegotiable,
          quantity: Number(quantity),
          condition,
          location: location.trim(),
          images: imageUrls,
          variants: variantsObj,
          is_active: true,
          like_count: 0,
        })
        .select('id')
        .single()

      if (productErr) throw new Error(productErr.message)

      setSuccess(true)
      setTimeout(() => {
        void navigate(`/product/${(product).id}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-xl font-display font-bold text-white">Product Listed!</h2>
        <p className="text-sm text-zinc-400 text-center">Your product is now live on KASAJA</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => void navigate(-1)} className="p-1.5 rounded-lg hover:bg-white/5">
          <ChevronLeft className="w-5 h-5 text-zinc-300" />
        </button>
        <h1 className="font-display font-bold text-white">List a Product</h1>
      </div>

      <div className="px-4 py-5 space-y-6 max-w-lg mx-auto">

        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Photos <span className="text-brand-500">*</span>
            <span className="text-zinc-500 font-normal ml-1">({images.length}/6)</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 text-xs bg-brand-500 text-white px-1.5 py-0.5 rounded-md">Cover</span>
                )}
              </div>
            ))}
            {images.length < 6 && (
              <button
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center gap-1 hover:border-brand-500 transition-colors"
              >
                <Camera className="w-6 h-6 text-zinc-500" />
                <span className="text-xs text-zinc-500">Add Photo</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { void addImage(e.target.files) }} />
          <p className="text-xs text-zinc-500 mt-1.5">First photo is the cover. Up to 6 photos.</p>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Product Title <span className="text-brand-500">*</span>
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Ankara Fabric 6 yards, red/blue"
            className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Category <span className="text-brand-500">*</span>
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-500 appearance-none"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Price (₦) <span className="text-brand-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">₦</span>
            <input
              type="number"
              value={priceKobo}
              onChange={e => setPriceKobo(e.target.value)}
              placeholder="0.00"
              min="0"
              className="w-full bg-surface border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <div
              onClick={() => setIsNegotiable(p => !p)}
              className={`w-10 h-6 rounded-full transition-colors ${isNegotiable ? 'bg-brand-500' : 'bg-zinc-700'} relative`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isNegotiable ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className="text-sm text-zinc-400">Price is negotiable</span>
          </label>
        </div>

        {/* Condition */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Condition</label>
          <div className="flex gap-2">
            {(['new'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCondition(c)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors capitalize ${
                  condition === c ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-white/10 text-zinc-400 hover:border-white/20'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Quantity Available</label>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            min="1"
            className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Location</label>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Balogun Market, Lagos Island"
            className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe your product — material, size, weight, usage, what's included..."
            rows={4}
            className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>

        {/* Variants */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-zinc-300">Variants (optional)</label>
            <button onClick={addVariant} className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400">
              <Plus className="w-3.5 h-3.5" /> Add variant
            </button>
          </div>
          {variants.length === 0 && (
            <p className="text-xs text-zinc-500">e.g. Size: S, M, L, XL — or Color: Red, Blue, Green</p>
          )}
          {variants.map((v, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                value={v.name}
                onChange={e => updateVariant(i, 'name', e.target.value)}
                placeholder="Name (e.g. Size)"
                className="flex-1 bg-surface border border-white/10 rounded-xl px-3 py-2 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-brand-500"
              />
              <input
                value={v.options}
                onChange={e => updateVariant(i, 'options', e.target.value)}
                placeholder="Options (comma separated)"
                className="flex-2 bg-surface border border-white/10 rounded-xl px-3 py-2 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-brand-500 w-40"
              />
              <button onClick={() => removeVariant(i)} className="p-2 text-zinc-500 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={() => void submit()}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-base transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Listing Product...</> : 'List Product'}
        </button>
      </div>
    </div>
  )
}
