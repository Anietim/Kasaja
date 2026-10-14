import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { X, ImagePlus, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export const WALLPAPERS = [
  { id: 'default', label: 'Default', css: 'none' },
  { id: 'night',   label: 'Night',   css: 'linear-gradient(160deg,#0f172a,#1e1b4b)' },
  { id: 'forest',  label: 'Forest',  css: 'linear-gradient(160deg,#052e16,#14532d)' },
  { id: 'ember',   label: 'Ember',   css: 'linear-gradient(160deg,#1c0a00,#7c2d12)' },
  { id: 'ocean',   label: 'Ocean',   css: 'linear-gradient(160deg,#082f49,#155e75)' },
  { id: 'ink',     label: 'Ink',     css: '#000000' },
]

export function wallpaperStyle(w: string | null): React.CSSProperties {
  if (!w) return {}
  if (w.startsWith('preset:')) {
    const p = WALLPAPERS.find(x => `preset:${x.id}` === w)
    return p && p.css !== 'none' ? { background: p.css } : {}
  }
  if (w.startsWith('http')) {
    return { backgroundImage: `url(${w})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  }
  return {}
}

// The wallpaper is stored in a private table: only its owner can read it.
export function useChatWallpaper() {
  const { user } = useAuth()
  const [wallpaper, setWallpaper] = useState<string | null>(null)

  useEffect(() => {
    if (!user || import.meta.env.DEV) return
    void supabase.from('chat_settings').select('wallpaper').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setWallpaper((data?.wallpaper as string | null) ?? null))
  }, [user])

  const save = async (value: string | null) => {
    if (!user) return
    setWallpaper(value)
    const { error } = await supabase.from('chat_settings')
      .upsert({ user_id: user.id, wallpaper: value, updated_at: new Date().toISOString() })
    if (error) toast.error(error.message)
  }
  return { wallpaper, save }
}

export function ChatWallpaperSheet({
  open, onClose, current, onSave,
}: { open: boolean; onClose: () => void; current: string | null; onSave: (v: string | null) => Promise<void> }) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  if (!open) return null

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Use a JPEG, PNG or WebP image'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `wallpapers/${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('kasaja-media').upload(path, file)
    if (error) { toast.error(error.message); setUploading(false); return }
    const { data } = supabase.storage.from('kasaja-media').getPublicUrl(path)
    await onSave(data.publicUrl)
    setUploading(false)
    toast.success('Wallpaper set. Only you can see it.')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div className="bg-zinc-900 rounded-t-3xl p-5 pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Chat wallpaper</h3>
          <button onClick={onClose} className="p-1 text-zinc-400"><X size={20} /></button>
        </div>
        <p className="text-xs text-zinc-400 mb-3">Only you can see your wallpaper.</p>
        <div className="grid grid-cols-3 gap-3">
          {WALLPAPERS.map(w => {
            const value = w.id === 'default' ? null : `preset:${w.id}`
            const active = (current ?? null) === value
            return (
              <button
                key={w.id}
                onClick={() => { void onSave(value); onClose() }}
                className={`h-20 rounded-2xl border-2 text-xs text-white flex items-end p-2 ${active ? 'border-brand-500' : 'border-zinc-700'}`}
                style={w.css === 'none' ? { background: '#18181b' } : { background: w.css }}
              >
                {w.label}
              </button>
            )
          })}
        </div>
        <label className="mt-4 w-full flex items-center justify-center gap-2 bg-brand-500 text-white font-semibold py-3 rounded-xl cursor-pointer">
          {uploading ? <Loader2 className="animate-spin" size={16} /> : <ImagePlus size={16} />}
          Use my photo
          <input type="file" accept="image/*" className="hidden" onChange={e => { void upload(e) }} />
        </label>
      </div>
    </div>
  )
}