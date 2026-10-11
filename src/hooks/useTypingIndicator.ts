import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface TypingUser {
  userId: string
  displayName: string
  timestamp: number
}

interface UseTypingOptions {
  channelName: string
  userId: string
  displayName: string
  onTypingChange: (typingUsers: TypingUser[]) => void
}

export function useTypingIndicator({ channelName, userId, displayName, onTypingChange }: UseTypingOptions) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingUsersRef = useRef<Map<string, TypingUser>>(new Map())

  useEffect(() => {
    const channel = supabase.channel(`typing:${channelName}`, {
      config: { presence: { key: userId } }
    })

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { userId: uid, displayName: name, isTyping } = payload as {
          userId: string; displayName: string; isTyping: boolean
        }
        if (uid === userId) return

        if (isTyping) {
          typingUsersRef.current.set(uid, { userId: uid, displayName: name, timestamp: Date.now() })
        } else {
          typingUsersRef.current.delete(uid)
        }
        onTypingChange(Array.from(typingUsersRef.current.values()))
      })
      .subscribe()

    channelRef.current = channel

    // Clean up stale typing indicators every 5s
    const interval = setInterval(() => {
      const now = Date.now()
      let changed = false
      typingUsersRef.current.forEach((u, key) => {
        if (now - u.timestamp > 5000) {
          typingUsersRef.current.delete(key)
          changed = true
        }
      })
      if (changed) onTypingChange(Array.from(typingUsersRef.current.values()))
    }, 5000)

    return () => {
      clearInterval(interval)
      void channel.unsubscribe()
    }
  }, [channelName, userId, displayName, onTypingChange])

  const sendTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current) return
    void channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, displayName, isTyping }
    })
  }, [userId, displayName])

  const handleTyping = useCallback(() => {
    sendTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 3000)
  }, [sendTyping])

  return { handleTyping }
}
