import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Video, VideoOff, Mic, MicOff, Users, ShoppingBag, Heart, Send, X, Plus, Tag, Share2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

const DEV_BYPASS = import.meta.env.DEV

interface LiveComment { id: string; user: string; text: string; color: string; isOrder?: boolean }
interface PinnedProduct { id: string; title: string; price: number; image: string; sold: number }

const COLORS = ['#7C3AED','#06B6D4','#EC4899','#10B981','#F59E0B','#EF4444']
const DEV_COMMENTS: LiveComment[] = [
  { id: '1', user: 'Chioma', text: 'How much for the ankara? 👀', color: '#7C3AED' },
  { id: '2', user: 'Emeka', text: 'Boss I wan buy 2 pieces', color: '#06B6D4', isOrder: true },
  { id: '3', user: 'FabricHub', text: 'Quality looks 🔥🔥', color: '#EC4899' },
  { id: '4', user: 'Ngozi', text: 'Do you deliver to Abuja?', color: '#10B981' },
  { id: '5', user: 'TechKing', text: 'ORDERED! ✅', color: '#F59E0B', isOrder: true },
]
const DEV_PRODUCTS: PinnedProduct[] = [
  { id: '1', title: 'Ankara Fabric 6 yards', price: 8500, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80', sold: 12 },
  { id: '2', title: 'Adire Tie-Dye Set', price: 6200, image: 'https://images.unsplash.com/photo-1586495777744-4e6232bf4d45?w=120&q=80', sold: 7 },
]

const NOW = Date.now()

export default function LiveSell() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [camOn, setCamOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [viewers, setViewers] = useState(0)
  const [likes, setLikes] = useState(0)
  const [comments, setComments] = useState<LiveComment[]>([])
  const [msg, setMsg] = useState('')
  const [pinnedProducts, setPinnedProducts] = useState<PinnedProduct[]>([])
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number }[]>([])
  const [duration, setDuration] = useState(0)
  const [startedAt] = useState(NOW)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const startLive = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('This browser cannot use the camera here. Open KASAJA in Chrome or Safari over https.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      streamRef.current = stream
      setIsLive(true)          // the video element appears now; the effect below attaches the stream to it
      setViewers(1)
      setComments(DEV_BYPASS ? DEV_COMMENTS : [])
      setPinnedProducts(DEV_BYPASS ? DEV_PRODUCTS : [])
      toast.success('You are now LIVE!')
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError') toast.error('Camera is blocked. Tap the lock icon in the address bar, allow Camera and Microphone, then try again.')
      else if (name === 'NotFoundError') toast.error('No camera was found on this device.')
      else if (name === 'NotReadableError') toast.error('Another app is using your camera. Close it and try again.')
      else toast.error('Could not access the camera. Check permissions.')
    }
  }, [])

  const stopLive = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setIsLive(false)
    const mins = Math.round((Date.now() - startedAt) / 60000)
    toast.success(`Live ended. ${mins} min · ${viewers} viewers · ${likes} likes`)
    void navigate(-1)
  }, [startedAt, viewers, likes, navigate])

  const toggleCam = useCallback(() => {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setCamOn(v => !v)
  }, [])

  const toggleMic = useCallback(() => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setMicOn(v => !v)
  }, [])

  const sendComment = useCallback(() => {
    if (!msg.trim()) return
    const c: LiveComment = {
      id: Date.now().toString(),
      user: user?.email?.split('@')[0] ?? 'You',
      text: msg.trim(),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }
    setComments(prev => [...prev.slice(-49), c])
    setMsg('')
  }, [msg, user])

  const addHeart = useCallback(() => {
    setLikes(v => v + 1)
    const heart = { id: Date.now(), x: 20 + Math.random() * 60 }
    setFloatingHearts(prev => [...prev, heart])
    setTimeout(() => setFloatingHearts(prev => prev.filter(h => h.id !== heart.id)), 1500)
  }, [])

  const pinProduct = useCallback((p: PinnedProduct) => {
    setPinnedProducts(prev => prev.find(x => x.id === p.id) ? prev : [...prev, p])
    setShowProductPicker(false)
  }, [])

  // Attach the camera to the video as soon as it exists on screen
  useEffect(() => {
    if (!isLive) return
    const v = videoRef.current
    if (v && streamRef.current) {
      v.srcObject = streamRef.current
      void v.play().catch(() => {})
    }
  }, [isLive])

  // timer
  useEffect(() => {
    if (!isLive) return
    const t = setInterval(() => setDuration(d => d + 1), 1000)
    return () => clearInterval(t)
  }, [isLive])

  // simulate comments in dev
  useEffect(() => {
    if (!isLive || !DEV_BYPASS) return
    const msgs = [
      'How much for delivery to Lagos?',
      'This is beautiful! 😍',
      'I want 3 pieces!',
      'Do you accept transfer?',
      'Best quality in the market! 🙌',
      'Can I get a discount for bulk?',
      'Just placed my order ✅',
      'Shipping to Port Harcourt?',
    ]
    const t = setInterval(() => {
      const c: LiveComment = {
        id: Date.now().toString(),
        user: ['Amaka', 'Seun', 'Kola', 'Ngozi', 'Bola', 'Chidi'][Math.floor(Math.random() * 6)],
        text: msgs[Math.floor(Math.random() * msgs.length)],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        isOrder: Math.random() > 0.8,
      }
      setComments(prev => [...prev.slice(-49), c])
    }, 2500)
    return () => clearInterval(t)
  }, [isLive])

  // auto scroll comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  // cleanup on unmount
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  if (!isLive) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-10"
        style={{ background: '#080A0D' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)' }}>
          <Video size={36} className="text-white" />
        </div>
        <h1 className="text-white text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk,sans-serif' }}>
          Go Live
        </h1>
        <p className="text-white/60 text-sm text-center mb-8">
          Show your products in real time. Viewers can order directly from your live session.
        </p>
        <div className="w-full max-w-sm space-y-3 mb-8">
          {[
            { icon: Users, label: 'Real-time viewers', sub: 'See who is watching live' },
            { icon: ShoppingBag, label: 'Pin products', sub: 'Tap to buy while you stream' },
            { icon: Heart, label: 'Likes & comments', sub: 'Engage your audience' },
            { icon: Tag, label: 'Instant orders', sub: 'Buyers order without leaving the stream' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: '#11151A' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(124,58,237,0.15)' }}>
                <Icon size={20} style={{ color: '#7C3AED' }} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{label}</p>
                <p className="text-white/50 text-xs">{sub}</p>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => { void startLive() }}
          className="w-full max-w-sm py-4 rounded-2xl text-white font-bold text-lg"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)' }}>
          Start Live Session
        </button>
        <button onClick={() => void navigate(-1)}
          className="mt-4 text-white/50 text-sm">Cancel</button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>
      {/* video */}
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover"
        autoPlay muted playsInline />
      {/* dim overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom,rgba(0,0,0,0.3) 0%,transparent 30%,transparent 50%,rgba(0,0,0,0.7) 100%)' }} />

      {/* top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-12 pb-2">
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded-lg text-white text-xs font-bold flex items-center gap-1"
            style={{ background: '#EF4444' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
          <div className="px-2 py-1 rounded-lg text-white text-xs font-semibold backdrop-blur-sm"
            style={{ background: 'rgba(0,0,0,0.4)' }}>
            {formatDuration(duration)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-sm"
            style={{ background: 'rgba(0,0,0,0.4)' }}>
            <Eye size={12} className="text-white" />
            <span className="text-white text-xs font-semibold">{viewers}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-sm"
            style={{ background: 'rgba(0,0,0,0.4)' }}>
            <Heart size={12} className="text-white" />
            <span className="text-white text-xs font-semibold">{likes}</span>
          </div>
          <button onClick={stopLive}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#EF4444' }}>
            <X size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* pinned products */}
      {pinnedProducts.length > 0 && (
        <div className="relative z-10 px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {pinnedProducts.map(p => (
              <motion.div key={p.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl backdrop-blur-sm"
                style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(124,58,237,0.4)' }}>
                <img src={p.image} alt={p.title} className="w-8 h-8 rounded-lg object-cover" />
                <div>
                  <p className="text-white text-xs font-semibold max-w-[100px] truncate">{p.title}</p>
                  <p className="text-xs font-bold" style={{ color: '#7C3AED' }}>₦{p.price.toLocaleString()}</p>
                </div>
                <button className="px-2 py-1 rounded-lg text-white text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)' }}
                  onClick={() => toast.success('Order added!')}>
                  Buy
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* comments */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-4 pb-2 overflow-hidden">
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          <AnimatePresence initial={false}>
            {comments.map(c => (
              <motion.div key={c.id}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-1">
                {c.isOrder && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                    style={{ background: 'rgba(16,185,129,0.3)', color: '#10B981' }}>ORDER</span>
                )}
                <span className="text-xs font-bold flex-shrink-0" style={{ color: c.color }}>{c.user}</span>
                <span className="text-white/90 text-xs">{c.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={commentsEndRef} />
        </div>
      </div>

      {/* floating hearts */}
      <AnimatePresence>
        {floatingHearts.map(h => (
          <motion.div key={h.id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -120, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="absolute z-20 pointer-events-none"
            style={{ bottom: 120, left: `${h.x}%` }}>
            <Heart size={24} fill="#EC4899" style={{ color: '#EC4899' }} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* bottom controls */}
      <div className="relative z-10 px-4 pb-10">
        {/* comment input */}
        <div className="flex items-center gap-2 mb-4">
          <input value={msg} onChange={e => setMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendComment() }}
            placeholder="Say something..."
            className="flex-1 px-4 py-2.5 rounded-2xl text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }} />
          <button onClick={sendComment}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.5)' }}>
            <Send size={16} className="text-white" />
          </button>
        </div>
        {/* action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button onClick={toggleCam}
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: camOn ? 'rgba(255,255,255,0.2)' : '#EF4444' }}>
              {camOn ? <Video size={20} className="text-white" /> : <VideoOff size={20} className="text-white" />}
            </button>
            <button onClick={toggleMic}
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: micOn ? 'rgba(255,255,255,0.2)' : '#EF4444' }}>
              {micOn ? <Mic size={20} className="text-white" /> : <MicOff size={20} className="text-white" />}
            </button>
            <button onClick={() => setShowProductPicker(true)}
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Tag size={20} className="text-white" />
            </button>
            <button onClick={() => {
              void navigator.share?.({ title: 'Watch me LIVE on KASAJA!', url: window.location.href })
            }}
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Share2 size={20} className="text-white" />
            </button>
          </div>
          <button onClick={addHeart}
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#EC4899,#EF4444)' }}>
            <Heart size={24} className="text-white" fill="white" />
          </button>
        </div>
      </div>

      {/* product picker sheet */}
      <AnimatePresence>
        {showProductPicker && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="absolute inset-x-0 bottom-0 z-30 rounded-t-3xl p-6"
            style={{ background: '#11151A' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">Pin a Product</h3>
              <button onClick={() => setShowProductPicker(false)}>
                <X size={20} className="text-white/60" />
              </button>
            </div>
            <div className="space-y-3">
              {DEV_PRODUCTS.map(p => (
                <button key={p.id} onClick={() => pinProduct(p)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl text-left"
                  style={{ background: '#080A0D' }}>
                  <img src={p.image} alt={p.title} className="w-12 h-12 rounded-xl object-cover" />
                  <div className="flex-1">
                    <p className="text-white text-sm font-semibold">{p.title}</p>
                    <p className="text-xs" style={{ color: '#7C3AED' }}>₦{p.price.toLocaleString()}</p>
                  </div>
                  <Plus size={18} className="text-white/40" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
