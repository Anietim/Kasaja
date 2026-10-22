import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export const ID_FEE_NAIRA = 200
export const ID_FEE_KOBO = ID_FEE_NAIRA * 100

/** When to ask. "prompt" = a banner people can dismiss. "required" = banner stays and withdrawals stay locked. */
export const ID_RULES = {
  seller: { prompt: 10, required: 20, what: 'listings' },
  rider:  { prompt: 5,  required: 10, what: 'rides' },
  buyer:  { prompt: 5,  required: 10, what: 'orders' },
} as const

export type IdStatus = 'none' | 'paid' | 'reviewing' | 'verified' | 'rejected'

export function useIdStatus() {
  const { user } = useAuth()
  const [status, setStatus] = useState<IdStatus>('none')
  const [attempts, setAttempts] = useState(0)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return }
    const { data, error } = await supabase.from('profiles').select('id_status, id_attempts_left').eq('id', user.id).maybeSingle()
    if (!error && data) {
      setStatus(((data as { id_status?: string }).id_status ?? 'none') as IdStatus)
      setAttempts((data as { id_attempts_left?: number }).id_attempts_left ?? 0)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { void refresh() }, [refresh])
  return { status, attempts, loading, refresh }
}

export interface IdPrompt { level: 'prompt' | 'required'; count: number; threshold: number; what: string }

/** Counts real, completed activity and says whether to ask this person to verify their ID. */
export function useIdPrompt(): IdPrompt | null {
  const { user, profile } = useAuth()
  const { status, loading } = useIdStatus()
  const [result, setResult] = useState<IdPrompt | null>(null)

  useEffect(() => {
    if (import.meta.env.DEV || !user || loading || status === 'verified' || status === 'reviewing') { setResult(null); return }
    const roles: string[] = profile?.roles ?? []
    let alive = true
    void (async () => {
      let best: IdPrompt | null = null
      const consider = (count: number, rule: { prompt: number; required: number; what: string }) => {
        if (count < rule.prompt) return
        const level = count >= rule.required ? 'required' : 'prompt'
        const threshold = level === 'required' ? rule.required : rule.prompt
        if (!best || (level === 'required' && best.level !== 'required')) best = { level, count, threshold, what: rule.what }
      }
      if (roles.includes('seller')) {
        const { count } = await supabase.from('products')
          .select('id, store:stores!inner(owner_id)', { count: 'exact', head: true })
          .eq('store.owner_id', user.id).eq('status', 'active')
        consider(count ?? 0, ID_RULES.seller)
      }
      if (roles.includes('rider')) {
        const { count } = await supabase.from('delivery_requests')
          .select('id', { count: 'exact', head: true }).eq('rider_id', user.id).eq('status', 'delivered')
        consider(count ?? 0, ID_RULES.rider)
      }
      {
        const { count } = await supabase.from('orders')
          .select('id', { count: 'exact', head: true }).eq('buyer_id', user.id).eq('status', 'completed')
        consider(count ?? 0, ID_RULES.buyer)
      }
      if (alive) setResult(best)
    })()
    return () => { alive = false }
  }, [user, profile?.roles, status, loading])

  return result
}
