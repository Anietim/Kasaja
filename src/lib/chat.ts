import { supabase } from '@/lib/supabase'

/**
 * Finds the conversation between the signed-in user and another user,
 * or creates it if it doesn't exist yet. Returns the conversation id,
 * or null if something went wrong.
 */
export async function getOrCreateConversation(otherUserId: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !otherUserId || user.id === otherUserId) return null

  // The table stores the two people in a fixed (sorted) order
  const a = user.id < otherUserId ? user.id : otherUserId
  const b = user.id < otherUserId ? otherUserId : user.id

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_a', a)
    .eq('participant_b', b)
    .maybeSingle()
  if (existing?.id) return existing.id as string

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ participant_a: a, participant_b: b })
    .select('id')
    .single()
  if (error || !created) return null
  return created.id as string
}