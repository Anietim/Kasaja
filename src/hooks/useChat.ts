import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Message, Profile } from '../types/database'

export function useChat(conversationId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading,  setLoading]  = useState(true)

  const loadMessages = useCallback(async () => {
    if (!conversationId) return
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles(id, display_name, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true })
      .limit(100)
    setMessages(data ?? [])
    setLoading(false)
  }, [conversationId])

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    void loadMessages()
    if (!conversationId) return

    // Realtime subscription
    const channel = supabase.channel(`chat:${conversationId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as Message
        void supabase
          .from('profiles').select('*').eq('id', newMsg.sender_id).single()
          .then(({ data: sender }) => {
            setMessages(prev => [...prev, { ...newMsg, sender: (sender as Profile) ?? undefined }])
          })
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [conversationId, loadMessages])

  async function sendMessage(
    senderId: string,
    content: string,
    type: Message['type'] = 'text',
    mediaUrls: string[] = [],
    offerAmountNgn: number | null = null
  ) {
    if (!conversationId) return
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id:       senderId,
      type,
      content:         content || null,
      media_urls:      mediaUrls,
      offer_amount_ngn: offerAmountNgn,
    })
  }

  async function softDelete(messageId: string, userId: string) {
    // Append userId to deleted_by — row is never removed
    const msg = messages.find(m => m.id === messageId)
    if (!msg) return
    const newDeleted = [...(msg.deleted_by ?? []), userId]
    await supabase.from('messages').update({ deleted_by: newDeleted }).eq('id', messageId)
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, deleted_by: newDeleted } : m))
  }

  return { messages, loading, sendMessage, softDelete, reload: loadMessages }
}
