import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Type, Hash, Tag, Send, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { validateImageFile } from '@/lib/security'
import { toast } from 'sonner'

const DEV_UID = 'dev-super-admin-id'
const DEV = import.meta.env.DEV

export default function PostStory() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [hashtagInput, setHashtagInput] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [posting, setPosting] = useState(false)
  const [step, setStep] = useState<'pick' | 'compose'>('pick')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    void (async () => {
      const result = await validateImageFile(f)
      if (!result.ok) { toast.error(result.error ?? 'Invalid file'); return }
      setFile(f)
      const reader = new FileReader()
      reader.onload = ev => {
        setPreview(ev.target?.result as string)
        setStep('compose')
      }
      reader.readAsDataURL(f)
    })()
  }

  function addHashtag() {
    const tag = hashtagInput.trim().replace(/^#/, '').toLowerCase()
    if (!tag || hashtags.includes(tag) || hashtags.length >= 5) return
    setHashtags(prev => [...prev, tag])
    setHashtagInput('')
  }

  function removeHashtag(tag: string) {
    setHashtags(prev => prev.filter(t => t !== tag))
  }

  async function postStory() {
    if (!file || !preview) return
    setPosting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id ?? (DEV ? DEV_UID : null)
      if (!uid) { toast.error('Not signed in'); return }

      // Upload image to Supabase Storage
      const ext = file.name.split('.').pop() ?? 'jpg'
      // Use a flat path so anon policy covers dev-mode uploads too
      const safePath = `stories/public/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('kasaja-media')
        .upload(safePath, file, { contentType: file.type, upsert: false })
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage
        .from('kasaja-media')
        .getPublicUrl(safePath)

      // Insert story row
      const { error: insertErr } = await supabase.from('stories').insert({
        user_id: uid,
        media_url: urlData.publicUrl,
        media_type: 'image',
        caption: caption.trim() || null,
        hashtags,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      if (insertErr) throw insertErr

      toast.success('Story posted! Visible for 24 hours.')
      void navigate('/home')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed'
      toast.error(msg)
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#080A0D' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <button onClick={() => { void navigate(-1) }} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <span className="font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>New Story</span>
        <div className="w-9" />
      </div>

      <AnimatePresence mode="wait">
        {step === 'pick' && (
          <motion.div
            key="pick"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center gap-6 px-8"
          >
            {/* Pick photo */}
            <button
              onClick={() => fileRef.current?.click()}
              className="w-40 h-40 rounded-3xl flex flex-col items-center justify-center gap-3 border-2 border-dashed transition-all active:scale-95"
              style={{ borderColor: 'rgba(255,122,0,0.4)', background: 'rgba(255,122,0,0.05)' }}
            >
              <ImagePlus size={40} style={{ color: '#FF7A00' }} />
              <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>Choose photo</span>
            </button>
            <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
              JPEG, PNG or WebP · Max 10 MB · Story visible for 24 hours
            </p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
          </motion.div>
        )}

        {step === 'compose' && preview && (
          <motion.div
            key="compose"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            {/* Image preview */}
            <div className="relative mx-4 mt-4 rounded-3xl overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: '50vh' }}>
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
              <button
                onClick={() => { setPreview(null); setFile(null); setStep('pick') }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.6)' }}
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            {/* Compose section */}
            <div className="flex-1 px-4 pt-4 pb-6 space-y-4">
              {/* Caption */}
              <div className="flex items-start gap-3">
                <Type size={18} style={{ color: '#FF7A00', marginTop: 3 }} />
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  maxLength={200}
                  rows={2}
                  className="flex-1 bg-transparent resize-none text-white text-sm outline-none placeholder:text-white/30"
                />
              </div>

              {/* Hashtags */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Hash size={18} style={{ color: '#6366F1' }} />
                  <input
                    value={hashtagInput}
                    onChange={e => setHashtagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addHashtag() } }}
                    placeholder="Add hashtag (press Enter)"
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
                  />
                  {hashtagInput && (
                    <button onClick={addHashtag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#6366F1', color: 'white' }}>
                      Add
                    </button>
                  )}
                </div>
                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pl-7">
                    {hashtags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1', border: '1px solid rgba(99,102,241,0.3)' }}>
                        #{tag}
                        <button onClick={() => removeHashtag(tag)}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Product tag hint */}
              <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: '#11151A' }}>
                <Tag size={16} style={{ color: '#10B981' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Product tagging coming soon — link products directly to your story
                </span>
              </div>
            </div>

            {/* Post button */}
            <div className="px-4 pb-8">
              <button
                onClick={() => { void postStory() }}
                disabled={posting}
                className="w-full h-13 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-opacity active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #FF7A00, #6366F1)',
                  opacity: posting ? 0.7 : 1,
                  height: 52,
                }}
              >
                {posting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Posting...
                  </span>
                ) : (
                  <>
                    <Send size={18} />
                    Post Story
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
