import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart, Send, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { getOrCreateConversation } from '@/lib/chat'

interface Story {
  id: string
  user_id: string
  media_url: string
  media_type: string
  caption?: string
  hashtags?: string[]
  expires_at: string
  created_at: string
  author?: { display_name: string; avatar_url?: string }
}

interface StoryGroup {
  userId: string
  userName: string
  avatarUrl?: string
  stories: Story[]
}

interface StoryViewerProps {
  groups: StoryGroup[]
  initialGroupIndex: number
  onClose: () => void
}

const STORY_DURATION = 5000 // 5 seconds per story

function timeAgo(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h`
}

export function StoryViewer({ groups, initialGroupIndex, onClose }: StoryViewerProps) {
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex)
  const [storyIdx, setStoryIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [liked, setLiked] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showReply, setShowReply] = useState(false)
  const [muted, setMuted] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const elapsed = useRef<number>(0)

  const currentGroup = groups[groupIdx]
  const currentStory = currentGroup?.stories[storyIdx]

  const goNext = useCallback(() => {
    if (!currentGroup) return
    if (storyIdx < currentGroup.stories.length - 1) {
      setStoryIdx(s => s + 1)
      setProgress(0)
      setLiked(false)
      elapsed.current = 0
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(g => g + 1)
      setStoryIdx(0)
      setProgress(0)
      setLiked(false)
      elapsed.current = 0
    } else {
      onClose()
    }
  }, [currentGroup, storyIdx, groupIdx, groups.length, onClose])

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx(s => s - 1)
      setProgress(0)
      elapsed.current = 0
    } else if (groupIdx > 0) {
      setGroupIdx(g => g - 1)
      setStoryIdx(0)
      setProgress(0)
      elapsed.current = 0
    }
  }, [storyIdx, groupIdx])

  // Auto-advance timer
  useEffect(() => {
    if (paused || showReply) return
    elapsed.current = 0
    startTimeRef.current = Date.now() // inside useEffect — not render, safe
    intervalRef.current = setInterval(() => {
      elapsed.current = Date.now() - startTimeRef.current
      const pct = Math.min((elapsed.current / STORY_DURATION) * 100, 100)
      setProgress(pct)
      if (pct >= 100) goNext()
    }, 50)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [storyIdx, groupIdx, paused, showReply, goNext])

  // Mark as viewed
  useEffect(() => {
    if (!currentStory) return
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await supabase.from('story_views').upsert({
        story_id: currentStory.id,
        viewer_id: session.user.id,
      }, { onConflict: 'story_id,viewer_id' })
    })()
  }, [currentStory])

    async function sendReply() {
    if (!replyText.trim() || !currentStory) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sign in to reply'); return }
    const cid = await getOrCreateConversation(currentStory.user_id)
    if (!cid) { toast.error('Could not send your reply'); return }
    const { error } = await supabase.from('messages').insert({
      conversation_id: cid,
      sender_id: user.id,
      type: 'text',
      content: `↩ Status reply: ${replyText.trim()}`,
    })
    if (error) { toast.error(error.message); return }
    toast.success('Reply sent!')
    setReplyText('')
    setShowReply(false)
  }

  if (!currentGroup || !currentStory) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: '#000' }}
      >
        {/* Story container */}
        <div className="relative w-full max-w-sm h-full max-h-dvh overflow-hidden"
          style={{ aspectRatio: '9/16', background: '#111' }}>

          {/* Background image */}
          <AnimatePresence mode="wait">
            <motion.img
              key={currentStory.id}
              src={currentStory.media_url}
              alt=""
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70" />

          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 pt-3">
            {currentGroup.stories.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.3)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'white',
                    width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-6 left-0 right-0 flex items-center gap-3 px-3 pt-2">
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white flex-shrink-0"
              style={{ borderColor: '#7C3AED' }}>
              {currentGroup.avatarUrl ? (
                <img src={currentGroup.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)' }}>
                  {currentGroup.userName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{currentGroup.userName}</p>
              <p className="text-white/60 text-xs">{timeAgo(currentStory.created_at)}</p>
            </div>
            <button onClick={() => setMuted(m => !m)} className="p-1.5 text-white/70">
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button onClick={onClose} className="p-1.5 text-white/70">
              <X size={20} />
            </button>
          </div>

          {/* Tap zones */}
          <div className="absolute inset-0 flex" style={{ top: 60, bottom: 80 }}>
            <div className="flex-1" onPointerDown={goPrev}
              onPointerUp={() => setPaused(false)}
              style={{ cursor: 'pointer' }} />
            <div className="flex-1"
              onPointerDown={() => { setPaused(true) }}
              onPointerUp={() => { setPaused(false); goNext() }}
              style={{ cursor: 'pointer' }} />
          </div>

          {/* Caption + hashtags */}
          {(currentStory.caption || (currentStory.hashtags?.length ?? 0) > 0) && (
            <div className="absolute bottom-20 left-0 right-0 px-4">
              {currentStory.caption && (
                <p className="text-white text-sm font-medium mb-1 drop-shadow">{currentStory.caption}</p>
              )}
              {(currentStory.hashtags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1">
                  {currentStory.hashtags!.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(124,58,237,0.4)', color: '#c4b5fd' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bottom actions */}
          {showReply ? (
            <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 p-3"
              style={{ background: 'rgba(0,0,0,0.8)' }}>
              <input
                autoFocus
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void sendReply() }}
                placeholder="Reply to story..."
                className="flex-1 bg-white/10 text-white text-sm rounded-full px-4 py-2 outline-none placeholder:text-white/40"
              />
              <button onClick={() => void sendReply()}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)' }}>
                <Send size={16} className="text-white" />
              </button>
              <button onClick={() => setShowReply(false)} className="text-white/60">
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-4 pb-6 pt-2">
              <button
                onClick={() => setShowReply(true)}
                className="flex-1 bg-white/10 text-white/60 text-sm rounded-full px-4 py-2.5 text-left backdrop-blur"
              >
                Reply to {currentGroup.userName}...
              </button>
              <button
                onClick={() => setLiked(l => !l)}
                className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur"
                style={{ background: liked ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)' }}
              >
                <Heart size={20} className={liked ? 'fill-red-500 text-red-500' : 'text-white'} />
              </button>
            </div>
          )}

          {/* Prev/Next group arrows */}
          {groupIdx > 0 && (
            <button onClick={() => { setGroupIdx(g => g - 1); setStoryIdx(0); setProgress(0) }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.4)' }}>
              <ChevronLeft size={18} className="text-white" />
            </button>
          )}
          {groupIdx < groups.length - 1 && (
            <button onClick={() => { setGroupIdx(g => g + 1); setStoryIdx(0); setProgress(0) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.4)' }}>
              <ChevronRight size={18} className="text-white" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
