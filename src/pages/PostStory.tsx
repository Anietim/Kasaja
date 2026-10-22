import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Type, Hash, Send, X, Plus, Play } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import '@/styles/kasaja-theme.css'

const DEV_UID = 'dev-super-admin-id'
const DEV = import.meta.env.DEV

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const MAX_IMAGE_MB = 30   // Instagram-size photos
const MAX_VIDEO_MB = 50   // limit of the storage plan
const MAX_ITEMS = 10

interface Item { id: string; file: File; url: string; video: boolean; caption: string }

export default function PostStory() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>([])
  const [active, setActive] = useState(0)
  const [hashtagInput, setHashtagInput] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [posting, setPosting] = useState(false)
  const [progress, setProgress] = useState(0)
  const itemsRef = useRef<Item[]>([])
  itemsRef.current = items

  // free preview memory when leaving the page
  useEffect(() => () => { itemsRef.current.forEach(i => URL.revokeObjectURL(i.url)) }, [])

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (list.length === 0) return
    const room = MAX_ITEMS - items.length
    if (list.length > room) toast.error(`You can add up to ${MAX_ITEMS} photos or videos at a time`)
    const added: Item[] = []
    for (const f of list.slice(0, Math.max(room, 0))) {
      const video = VIDEO_TYPES.includes(f.type)
      if (!video && !IMAGE_TYPES.includes(f.type)) { toast.error(`${f.name}: use JPEG, PNG or WebP photos, or MP4, WebM or MOV videos`); continue }
      const mb = f.size / 1024 / 1024
      if (!video && mb > MAX_IMAGE_MB) { toast.error(`${f.name} is ${mb.toFixed(0)} MB. Photos can be up to ${MAX_IMAGE_MB} MB`); continue }
      if (video && mb > MAX_VIDEO_MB) { toast.error(`${f.name} is ${mb.toFixed(0)} MB. Videos can be up to ${MAX_VIDEO_MB} MB`); continue }
      added.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file: f, url: URL.createObjectURL(f), video, caption: '' })
    }
    if (added.length === 0) return
    setItems(prev => {
      const next = [...prev, ...added]
      setActive(prev.length) // jump to the first newly added one
      return next
    })
  }

  function removeItem(id: string) {
    setItems(prev => {
      const target = prev.find(i => i.id === id)
      if (target) URL.revokeObjectURL(target.url)
      const next = prev.filter(i => i.id !== id)
      setActive(a => Math.min(a, Math.max(next.length - 1, 0)))
      return next
    })
  }

  function setCaption(v: string) {
    setItems(prev => prev.map((i, idx) => idx === active ? { ...i, caption: v } : i))
  }

  function addHashtag() {
    const tag = hashtagInput.trim().replace(/^#/, '').toLowerCase()
    if (!tag || hashtags.includes(tag) || hashtags.length >= 5) return
    setHashtags(prev => [...prev, tag])
    setHashtagInput('')
  }

  async function postStory() {
    if (items.length === 0) return
    setPosting(true); setProgress(0)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id ?? (DEV ? DEV_UID : null)
      if (!uid) { toast.error('Not signed in'); return }

      // Each photo / video becomes its own story, in the order shown. Original files, no cropping.
      for (let n = 0; n < items.length; n++) {
        const it = items[n]
        const ext = (it.file.name.split('.').pop() ?? (it.video ? 'mp4' : 'jpg')).toLowerCase()
        const path = `stories/public/${Date.now()}-${n}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('kasaja-media').upload(path, it.file, { contentType: it.file.type, upsert: false })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('kasaja-media').getPublicUrl(path)
        const { error: insErr } = await supabase.from('stories').insert({
          user_id: uid,
          media_url: urlData.publicUrl,
          media_type: it.video ? 'video' : 'image',
          caption: it.caption.trim() || null,
          hashtags,
          // small offset keeps the order you arranged them in
          created_at: new Date(Date.now() + n * 1000).toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        if (insErr) throw insErr
        setProgress(n + 1)
      }
      toast.success(items.length > 1 ? `${items.length} stories posted! Visible for 24 hours.` : 'Story posted! Visible for 24 hours.')
      void navigate('/home')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setPosting(false)
    }
  }

  const cur = items[active]
  const T = { color: 'var(--k-text)' }
  const M = { color: 'var(--k-muted)' }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--k-bg)', color: 'var(--k-text)' }}>
      <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleFiles} />

      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--k-line)' }}>
        <button onClick={() => { void navigate(-1) }} aria-label="Back" className="w-10 h-10 flex items-center justify-center rounded-full" style={T}>
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold" style={T}>New Story</span>
        <div className="w-10" />
      </div>

      {items.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center gap-5 px-8">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-44 h-44 rounded-3xl flex flex-col items-center justify-center gap-3 border-2 border-dashed transition-transform active:scale-95"
            style={{ borderColor: 'var(--k-accent)', background: 'var(--k-accent-soft)' }}
          >
            <ImagePlus size={40} style={{ color: 'var(--k-accent)' }} />
            <span className="text-sm font-semibold" style={T}>Choose photos or videos</span>
          </button>
          <p className="text-xs text-center" style={M}>You can pick several at once.</p>
        </motion.div>
      ) : (
        <div className="flex-1 flex flex-col max-w-xl w-full mx-auto">
          {/* Preview: the whole picture, nothing cut off */}
          <div className="relative mx-4 mt-4 rounded-3xl overflow-hidden flex items-center justify-center" style={{ background: '#000', height: '52vh', minHeight: 260 }}>
            {cur.video
              ? <video key={cur.id} src={cur.url} controls playsInline className="max-w-full max-h-full" style={{ objectFit: 'contain' }} />
              : <img key={cur.id} src={cur.url} alt="Preview" className="max-w-full max-h-full" style={{ objectFit: 'contain' }} />}
            <button onClick={() => removeItem(cur.id)} aria-label="Remove this one"
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}>
              <X size={16} />
            </button>
            {items.length > 1 && (
              <span className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}>
                {active + 1} / {items.length}
              </span>
            )}
          </div>

          {/* Thumbnails + add more */}
          <div className="flex gap-2 px-4 pt-3 overflow-x-auto no-scrollbar">
            {items.map((it, i) => (
              <button key={it.id} onClick={() => setActive(i)} aria-label={`Show item ${i + 1}`}
                className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0"
                style={{ border: `2px solid ${i === active ? 'var(--k-accent)' : 'var(--k-line)'}`, background: '#000' }}>
                {it.video
                  ? <><video src={it.url} muted className="w-full h-full object-cover" /><Play size={14} className="absolute inset-0 m-auto" style={{ color: '#fff' }} /></>
                  : <img src={it.url} alt="" className="w-full h-full object-cover" />}
              </button>
            ))}
            {items.length < MAX_ITEMS && (
              <button onClick={() => fileRef.current?.click()} aria-label="Add more"
                className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center"
                style={{ border: '2px dashed var(--k-line2)', color: 'var(--k-muted)' }}>
                <Plus size={20} />
              </button>
            )}
          </div>

          {/* Caption + hashtags */}
          <div className="flex-1 px-4 pt-4 pb-4 space-y-4">
            <div className="flex items-start gap-3">
              <Type size={18} style={{ color: 'var(--k-accent)', marginTop: 10 }} />
              <textarea
                value={cur.caption}
                onChange={e => setCaption(e.target.value)}
                placeholder={items.length > 1 ? `Caption for ${active + 1} of ${items.length}...` : 'Add a caption...'}
                maxLength={200}
                rows={2}
                className="flex-1 rounded-xl px-3 py-2 resize-none text-sm outline-none"
                style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)', color: 'var(--k-text)' }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Hash size={18} style={{ color: 'var(--k-accent)' }} />
                <input
                  value={hashtagInput}
                  onChange={e => setHashtagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addHashtag() } }}
                  placeholder="Add hashtag (press Enter)"
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--k-surface)', border: '1px solid var(--k-line)', color: 'var(--k-text)' }}
                />
                {hashtagInput && (
                  <button onClick={addHashtag} className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}>Add</button>
                )}
              </div>
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-8">
                  {hashtags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--k-accent-soft)', color: 'var(--k-accent)' }}>
                      #{tag}
                      <button onClick={() => setHashtags(h => h.filter(t => t !== tag))} aria-label={`Remove ${tag}`}><X size={11} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-4 pb-8">
            <button
              onClick={() => { void postStory() }}
              disabled={posting}
              className="w-full h-[52px] rounded-2xl flex items-center justify-center gap-2 font-extrabold transition-transform active:scale-95"
              style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)', opacity: posting ? 0.7 : 1 }}
            >
              {posting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,0,0,0.25)', borderTopColor: 'var(--k-on-accent)' }} />
                  Posting {progress + 1} of {items.length}...
                </span>
              ) : (<><Send size={18} /> Post {items.length > 1 ? `${items.length} stories` : 'story'}</>)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
