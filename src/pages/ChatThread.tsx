import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTypingIndicator } from '@/hooks/useTypingIndicator'
import { ChatWallpaperSheet, useChatWallpaper, wallpaperStyle } from '@/components/ChatWallpaperSheet'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { toast } from 'sonner'
import {
  ArrowLeft, Send, Mic, MicOff, Image, X, Reply,
  CheckCheck, Check, Smile, Trash2, Forward, Play, Pause,
  MoreVertical, Phone, Video, Search
} from 'lucide-react'
import { UserTicks } from '@/components/Tick'

const DEV = import.meta.env.DEV
const DEV_ID = 'dev-super-admin-id'
const DEV_NAME = 'Dev Admin'

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

interface Message {
  id: string
  sender_id: string
  content: string
  voice_url?: string
  voice_duration?: number
  images?: string[]
  reply_to_id?: string
  reply_to?: { content: string; sender_display_name: string } | null
  reactions: Record<string, string[]>
  deleted_for_everyone: boolean
  read_at?: string | null
  created_at: string
  sender?: { display_name: string; avatar_url: string | null; roles: string[] }
}

interface ConvInfo {
  id: string
  other: { id: string; display_name: string; avatar_url: string | null; roles: string[]; is_online?: boolean }
}

function canMessage(myRoles: string[], theirRoles: string[]): { allowed: boolean; reason: string } {
  // Super admin and admin can message anyone
  if (myRoles.includes('super_admin') || myRoles.includes('admin')) return { allowed: true, reason: '' }
  // Buyer can message seller and rider
  if (myRoles.includes('buyer') && (theirRoles.includes('seller') || theirRoles.includes('rider'))) return { allowed: true, reason: '' }
  // Seller can message buyer (order context)
  if (myRoles.includes('seller') && theirRoles.includes('buyer')) return { allowed: true, reason: '' }
  // Seller to seller — no direct DM
  if (myRoles.includes('seller') && theirRoles.includes('seller') && !theirRoles.includes('buyer')) {
    return { allowed: false, reason: 'Sellers cannot directly message other sellers. You can comment on their posts.' }
  }
  return { allowed: true, reason: '' }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

function formatDur(secs: number) {
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
}

function VoicePlayer({ url, duration }: { url: string; duration: number }) {
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { void audioRef.current.play(); setPlaying(true) }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setElapsed(Math.floor(audio.currentTime))
    const onEnd = () => { setPlaying(false); setElapsed(0) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd) }
  }, [])

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <audio ref={audioRef} src={url} />
      <button onClick={toggle} className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
        {playing ? <Pause size={14} className="text-black" /> : <Play size={14} className="text-black" />}
      </button>
      <div className="flex-1">
        <div className="h-1 bg-zinc-600 rounded-full">
          <div className="h-1 bg-brand-500 rounded-full transition-all" style={{ width: `${duration ? (elapsed / duration) * 100 : 0}%` }} />
        </div>
      </div>
      <span className="text-xs text-zinc-400 shrink-0">{formatDur(playing ? elapsed : duration)}</span>
    </div>
  )
}

const isEmojiOnly = (s: string) =>
  /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\u200d|\ufe0f|\s){1,12}$/u.test(s.trim()) &&
  /\p{Extended_Pictographic}/u.test(s)

export default function ChatThread() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const uid = DEV ? DEV_ID : user?.id ?? ''
  const uname = DEV ? DEV_NAME : (profile?.display_name ?? 'You')
  const myRoles: string[] = DEV ? ['buyer', 'seller', 'rider', 'admin', 'super_admin'] : (profile?.roles ?? ['buyer'])
  const { wallpaper, save: saveWallpaper } = useChatWallpaper()
  const [showWallpaper, setShowWallpaper] = useState(false)
  const [conv, setConv] = useState<ConvInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [reactingTo, setReactingTo] = useState<string | null>(null)
  const [selectedMsg, setSelectedMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [typingUsers, setTypingUsers] = useState<{ userId: string; displayName: string }[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [sendingImages, setSendingImages] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const { isRecording, duration, uploading: voiceUploading, startRecording, stopRecording, cancelRecording, formatDuration } = useVoiceRecorder()

  const { handleTyping } = useTypingIndicator({
    channelName: id ?? 'unknown',
    userId: uid,
    displayName: uname,
    onTypingChange: setTypingUsers
  })

  const loadConv = useCallback(async () => {
    if (!id) return
    const { data: c } = await supabase.from('conversations').select('*, participant_a, participant_b').eq('id', id).single()
    if (!c) { void navigate('/inbox'); return }
    const otherId: string = (c as { participant_a: string; participant_b: string }).participant_a === uid
      ? (c as { participant_a: string; participant_b: string }).participant_b
      : (c as { participant_a: string; participant_b: string }).participant_a
    const { data: op } = await supabase.from('profiles').select('id,display_name,avatar_url,roles').eq('id', otherId).single()
    setConv({ id, other: op as ConvInfo['other'] ?? { id: otherId, display_name: 'User', avatar_url: null, roles: [] } })
  }, [id, uid, navigate])

  const loadMessages = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(display_name,avatar_url,roles)')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
    setLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    // Mark messages as read
    await supabase.from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', id)
      .neq('sender_id', uid)
      .is('read_at', null)
  }, [id, uid])

    useEffect(() => {
    if (id) void supabase.rpc('mark_conversation_read', { p_conv: id })
  }, [id, messages.length])

  useEffect(() => { void loadConv(); void loadMessages() }, [loadConv, loadMessages])
    useEffect(() => {
    if (id) void supabase.rpc('mark_conversation_read', { p_conv: id })
  }, [id, messages.length])
  useEffect(() => {
    if (!id) return
    const channel = supabase.channel(`chat:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        (payload) => {
          void (async () => {
            const msg = payload.new as Message
            const { data: sender } = await supabase.from('profiles').select('display_name,avatar_url,roles').eq('id', msg.sender_id).single()
            setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, { ...msg, sender: sender as Message['sender'] }])
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
            if (msg.sender_id !== uid) {
              await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id)
            }
          })()
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        (payload) => {
          const updated = payload.new as Message
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
        })
      .subscribe()
    return () => { void channel.unsubscribe() }
  }, [id, uid])

    const sendMessage = async (opts: { content?: string; voiceUrl?: string; voiceDuration?: number; imageUrls?: string[] } = {}) => {
    const content = opts.content ?? text.trim()
    if (!content && !opts.voiceUrl && !opts.imageUrls?.length) return
    if (!id) return

    const msg = {
      conversation_id: id,
      sender_id: uid,
      content: content || '',
      voice_url: opts.voiceUrl ?? null,
      voice_duration: opts.voiceDuration ?? null,
      images: opts.imageUrls ?? [],
      reply_to_id: replyTo?.id ?? null,
      reactions: {},
      deleted_for_everyone: false,
    }

    setText('')
    setReplyTo(null)
    const { data: saved, error: sendErr } = await supabase.from('messages').insert(msg).select().single()
    if (sendErr || !saved) {
      toast.error('Message not sent: ' + (sendErr?.message ?? 'unknown error'))
      return
    }
    setMessages(prev => prev.some(m => m.id === (saved as Message).id) ? prev : [
      ...prev,
      { ...(saved as Message), sender: { display_name: uname, avatar_url: profile?.avatar_url ?? null, roles: myRoles } as Message['sender'] },
    ])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    const preview = content || (opts.voiceUrl ? '🎤 Voice message' : '📷 Photo')
    await supabase.from('conversations')
      .update({ last_message: preview, last_message_preview: preview, last_message_at: new Date().toISOString() })
      .eq('id', id)
  }

  const sendVoice = async () => {
    const result = await stopRecording()
    if (!result) return
    await sendMessage({ voiceUrl: result.url, voiceDuration: result.duration })
  }

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setImageFiles(files)
    setImagePreviews(files.map(f => URL.createObjectURL(f)))
  }

  const sendImages = async () => {
    if (!imageFiles.length) return
    setSendingImages(true)
    const urls: string[] = []
    for (const file of imageFiles) {
      const path = `chat/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('kasaja-media').upload(path, file)
      if (!error) {
        const { data } = supabase.storage.from('kasaja-media').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }
    setImageFiles([]); setImagePreviews([])
    setSendingImages(false)
    await sendMessage({ imageUrls: urls })
  }

  const addReaction = async (msgId: string, emoji: string) => {
    const msg = messages.find(m => m.id === msgId)
    if (!msg) return
    const reactions = { ...msg.reactions }
    if (!reactions[emoji]) reactions[emoji] = []
    if (reactions[emoji].includes(uid)) {
      reactions[emoji] = reactions[emoji].filter(u => u !== uid)
      if (!reactions[emoji].length) delete reactions[emoji]
    } else {
      reactions[emoji].push(uid)
    }
    await supabase.from('messages').update({ reactions }).eq('id', msgId)
    setReactingTo(null)
  }

  const deleteForEveryone = async (msgId: string) => {
    await supabase.from('messages').update({ deleted_for_everyone: true, content: '' }).eq('id', msgId)
    setSelectedMsg(null)
    toast.success('Message deleted')
  }

  const msgAccess = conv ? canMessage(myRoles, conv.other.roles) : { allowed: true, reason: '' }
  const filteredMessages = searchTerm
    ? messages.filter(m => m.content.toLowerCase().includes(searchTerm.toLowerCase()))
    : messages

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-canvas">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-canvas">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <button onClick={() => void navigate(-1)} className="p-1.5 rounded-xl hover:bg-zinc-800">
          <ArrowLeft size={20} className="text-white" />
        </button>
        {conv && (
          <button onClick={() => void navigate(`/profile/${conv.other.id}`)} className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-black font-bold text-sm overflow-hidden">
                {conv.other.avatar_url
                  ? <img src={conv.other.avatar_url} alt="" className="w-full h-full object-cover" />
                  : conv.other.display_name?.[0]?.toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm flex items-center gap-1"><span className="truncate">{conv.other.display_name}</span><UserTicks userId={conv.other.id} size={14} /></p>
              <p className="text-xs text-zinc-500">
                {typingUsers.length > 0 ? (
                  <span className="text-brand-400 animate-pulse">typing...</span>
                ) : (
                  conv.other.roles?.includes('seller') ? '🏪 Seller' : conv.other.roles?.includes('rider') ? '🏍️ Rider' : '🛒 Buyer'
                )}
              </p>
            </div>
          </button>
        )}
          <div className="flex items-center gap-1">
          <button onClick={() => setShowWallpaper(true)} className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 text-xs">🎨</button>
          <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400">
            <Search size={18} />
          </button>
          <button className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400" onClick={() => toast.info('Voice call coming soon')}>
            <Phone size={18} />
          </button>
          <button className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400" onClick={() => toast.info('Video call coming soon')}>
            <Video size={18} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800">
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search messages..."
            className="w-full bg-zinc-800 text-white text-sm rounded-xl px-4 py-2 outline-none placeholder:text-zinc-500"
            autoFocus
          />
        </div>
      )}

      {/* DM restriction banner */}
      {!msgAccess.allowed && (
        <div className="mx-4 mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400 text-center">
          {msgAccess.reason}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={wallpaperStyle(wallpaper)}>
        {filteredMessages.map((msg, idx) => {
          const isMine = msg.sender_id === uid
          const showAvatar = !isMine && (idx === 0 || filteredMessages[idx - 1]?.sender_id !== msg.sender_id)
          const hasReactions = Object.keys(msg.reactions ?? {}).length > 0

          if (msg.deleted_for_everyone) return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
              <span className="text-xs text-zinc-600 italic px-3 py-1.5 bg-zinc-800/50 rounded-xl">
                🚫 Message deleted
              </span>
            </div>
          )

          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} group mb-1`}>
             
              <div className="max-w-[75%]">
                {/* Reply context */}
                {msg.reply_to && (
                  <div className={`mb-1 px-3 py-1.5 rounded-lg border-l-2 border-brand-500 bg-zinc-800/50 text-xs text-zinc-400`}>
                    <span className="font-semibold text-brand-400">{msg.reply_to.sender_display_name}</span>
                    <p className="truncate">{msg.reply_to.content}</p>
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={`relative px-3 py-2 rounded-2xl cursor-pointer
                    ${isMine ? 'bg-brand-500 text-black rounded-br-sm' : 'bg-zinc-800 text-white rounded-bl-sm'}
                    ${selectedMsg === msg.id ? 'ring-2 ring-white/30' : ''}
                  `}
                  onDoubleClick={() => setReactingTo(msg.id)}
                  onClick={() => setSelectedMsg(selectedMsg === msg.id ? null : msg.id)}
                >
                  {/* Voice message */}
                  {msg.voice_url && (
                    <VoicePlayer url={msg.voice_url} duration={msg.voice_duration ?? 0} />
                  )}

                  {/* Images */}
                  {msg.images && msg.images.length > 0 && (
                    <div className={`grid gap-1 mb-1 ${msg.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {msg.images.map((url, i) => (
                        <img key={i} src={url} alt="" className="rounded-lg object-cover w-full max-h-48" />
                      ))}
                    </div>
                  )}

                  {/* Text */}
                      {msg.content && (
                      isEmojiOnly(msg.content)
                        ? <p className="text-5xl leading-tight px-2 py-1 rounded-2xl bg-white/20">{msg.content}</p>
                        : <p className="text-base font-semibold leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                    )}

                  {/* Time + status */}
                  <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-[10px] ${isMine ? 'text-black/50' : 'text-zinc-500'}`}>
                      {timeAgo(msg.created_at)}
                    </span>
                    {isMine && (
                      msg.read_at
                        ? <CheckCheck size={12} className="text-blue-400" />
                        : <Check size={12} className="text-black/50" />
                    )}
                  </div>
                </div>

                {/* Reactions */}
                {hasReactions && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        onClick={() => void addReaction(msg.id, emoji)}
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border
                          ${users.includes(uid) ? 'bg-brand-500/20 border-brand-500/50' : 'bg-zinc-800 border-zinc-700'}`}
                      >
                        <span>{emoji}</span>
                        <span className="text-zinc-400">{users.length}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Action bar on select */}
                {selectedMsg === msg.id && (
                  <div className={`flex gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <button onClick={() => { setReplyTo(msg); setSelectedMsg(null) }} className="p-1.5 bg-zinc-800 rounded-lg">
                      <Reply size={14} className="text-zinc-400" />
                    </button>
                    <button onClick={() => setReactingTo(msg.id)} className="p-1.5 bg-zinc-800 rounded-lg">
                      <Smile size={14} className="text-zinc-400" />
                    </button>
                    <button onClick={() => toast.info('Forwarded')} className="p-1.5 bg-zinc-800 rounded-lg">
                      <Forward size={14} className="text-zinc-400" />
                    </button>
                    {isMine && (
                      <button onClick={() => void deleteForEveryone(msg.id)} className="p-1.5 bg-zinc-800 rounded-lg">
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    )}
                    <button onClick={() => setSelectedMsg(null)} className="p-1.5 bg-zinc-800 rounded-lg">
                      <MoreVertical size={14} className="text-zinc-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 px-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
            <span className="text-xs text-zinc-500">
              {typingUsers.map(u => u.displayName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Emoji reaction picker */}
      {reactingTo && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-zinc-800 rounded-full px-3 py-2 flex gap-3 shadow-xl z-50 border border-zinc-700">
          {REACTIONS.map(e => (
            <button key={e} onClick={() => void addReaction(reactingTo, e)} className="text-xl hover:scale-125 transition-transform">
              {e}
            </button>
          ))}
          <button onClick={() => setReactingTo(null)} className="text-zinc-500 text-sm">✕</button>
        </div>
      )}

      {/* Image preview */}
      {imagePreviews.length > 0 && (
        <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex gap-2">
          {imagePreviews.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg" />
              <button onClick={() => { setImagePreviews(p => p.filter((_, j) => j !== i)); setImageFiles(f => f.filter((_, j) => j !== i)) }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <X size={10} className="text-white" />
              </button>
            </div>
          ))}
          <button onClick={() => void sendImages()} disabled={sendingImages}
            className="w-16 h-16 bg-brand-500 rounded-lg flex items-center justify-center text-black font-bold text-sm">
            {sendingImages ? '...' : 'Send'}
          </button>
        </div>
      )}

      {/* Reply context */}
      {replyTo && (
        <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2">
          <div className="flex-1 pl-3 border-l-2 border-brand-500">
            <p className="text-xs text-brand-400 font-semibold">
              {replyTo.sender_id === uid ? 'You' : replyTo.sender?.display_name}
            </p>
            <p className="text-xs text-zinc-400 truncate">{replyTo.content || '🎤 Voice message'}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-zinc-500"><X size={16} /></button>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-3 bg-zinc-900 border-t border-zinc-800 shrink-0">
        {isRecording ? (
          <div className="flex items-center gap-3 bg-zinc-800 rounded-2xl px-4 py-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 font-mono text-sm flex-1">{formatDuration(duration)}</span>
            <span className="text-xs text-zinc-500">max 20:00</span>
            <button onClick={cancelRecording} className="text-zinc-500"><X size={18} /></button>
            <button onClick={() => void sendVoice()} disabled={voiceUploading}
              className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center">
              <Send size={14} className="text-black" />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <button onClick={() => fileRef.current?.click()} className="p-2 text-zinc-400 hover:text-white shrink-0">
              <Image size={20} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagePick} />
            <div className="flex-1 bg-zinc-800 rounded-2xl px-4 py-2 min-h-[40px] flex items-end">
              <textarea
                ref={textRef}
                value={text}
                onChange={e => { setText(e.target.value); handleTyping() }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage() } }}
                placeholder={msgAccess.allowed ? "Type a message..." : "You cannot message this user"}
                disabled={!msgAccess.allowed}
                rows={1}
                className="w-full bg-transparent text-white text-base font-semibold outline-none placeholder:text-zinc-400 placeholder:font-normal resize-none max-h-32"
                style={{ fieldSizing: 'content' }}
              />
            </div>
            {text.trim() ? (
              <button onClick={() => void sendMessage()} className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center shrink-0">
                <Send size={16} className="text-black" />
              </button>
            ) : (
              <button
                onMouseDown={() => void startRecording()}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isRecording ? 'bg-red-500' : 'bg-zinc-700 hover:bg-zinc-600'}`}
              >
                {isRecording ? <MicOff size={16} className="text-white" /> : <Mic size={16} className="text-zinc-300" />}
              </button>
            )}
          </div>
        )}
      </div>
      <ChatWallpaperSheet open={showWallpaper} onClose={() => setShowWallpaper(false)} current={wallpaper} onSave={saveWallpaper} />
    </div>
  )
}
