// @ts-nocheck
// Called by the app right after Paystack closes. Asks Paystack directly whether the money arrived,
// so the user is confirmed in seconds and does not depend on the webhook.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return json({ ok: false, error: 'Sign in again' }, 401)

  const { reference } = await req.json().catch(() => ({}))
  if (!reference || typeof reference !== 'string') return json({ ok: false, error: 'No reference' }, 400)

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  })
  const body = await res.json().catch(() => ({}))
  const d = body?.data
  if (!body?.status || d?.status !== 'success') return json({ ok: false, status: d?.status ?? 'unknown' })

  const meta = d.metadata ?? {}
  if (meta.type !== 'id_verification' || meta.user_id !== user.id) return json({ ok: false, error: 'Payment does not belong to this account' }, 403)

  const { data, error } = await admin.rpc('confirm_id_payment', { p_user: user.id, p_ref: reference, p_amount: d.amount })
  if (error) { console.error('confirm_id_payment failed', error.message); return json({ ok: false, error: error.message }, 500) }
  return json({ ok: true, result: data })
})
