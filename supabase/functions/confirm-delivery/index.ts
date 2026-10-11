// @ts-nocheck
// Supabase Edge Function: confirm-delivery
// The buyer confirms receipt -> order becomes "completed" -> a delivery receipt
// (hash of the order id + timestamp, no personal data) is recorded on Arc mainnet.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  keccak256,
  parseAbi,
  stringToBytes,
} from 'npm:viem@2'
import { privateKeyToAccount } from 'npm:viem@2/accounts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// Supabase provides these automatically
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

// You add these three in Edge Functions -> Secrets (never in the project files)
const RPC_URL = Deno.env.get('ARC_RPC_URL') ?? 'https://rpc.mainnet.arc.io'
const CONTRACT = Deno.env.get('ARC_CONTRACT_ADDRESS') ?? ''
const RECORDER_KEY = Deno.env.get('ARC_RECORDER_PRIVATE_KEY') ?? ''
const EXPLORER = 'https://explorer.arc.io'

const arc = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
})

const abi = parseAbi([
  'function recordDelivery(bytes32 orderRef)',
  'function isConfirmed(bytes32 orderRef) view returns (bool)',
])

async function recordOnArc(orderId: string): Promise<string | null> {
  const orderRef = keccak256(stringToBytes(orderId))
  const key = RECORDER_KEY.startsWith('0x') ? RECORDER_KEY : `0x${RECORDER_KEY}`
  const account = privateKeyToAccount(key)
  const publicClient = createPublicClient({ chain: arc, transport: http(RPC_URL) })
  const wallet = createWalletClient({ account, chain: arc, transport: http(RPC_URL) })

  const already = await publicClient.readContract({
    address: CONTRACT, abi, functionName: 'isConfirmed', args: [orderRef],
  })
  if (already) return null // receipt already exists on-chain

  const hash = await wallet.writeContract({
    address: CONTRACT, abi, functionName: 'recordDelivery', args: [orderRef],
  })
  await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 })
  return hash
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // 1. Who is calling?
  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'Please sign in' }, 401)

  let orderId = ''
  try { orderId = (await req.json()).order_id ?? '' } catch { /* no body */ }
  if (!orderId) return json({ error: 'order_id is required' }, 400)

  // 2. Is this the buyer's own order, and is it ready to confirm?
  const db = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: order } = await db
    .from('orders')
    .select('id, buyer_id, status, arc_tx_hash')
    .eq('id', orderId)
    .maybeSingle()
  if (!order || order.buyer_id !== user.id) return json({ error: 'Order not found' }, 404)

  if (order.status === 'completed') {
    return json({
      ok: true,
      already_completed: true,
      tx_hash: order.arc_tx_hash ?? null,
      explorer_url: order.arc_tx_hash ? `${EXPLORER}/tx/${order.arc_tx_hash}` : null,
    })
  }
  if (!['dispatched', 'delivered'].includes(order.status)) {
    return json({ error: `This order cannot be confirmed yet (status: ${order.status})` }, 409)
  }

  // 3. Complete the order (the status guard stops double-clicks)
  const { data: updated, error: upErr } = await db
    .from('orders')
    .update({ status: 'completed', buyer_confirmed_at: new Date().toISOString() })
    .eq('id', orderId)
    .in('status', ['dispatched', 'delivered'])
    .select('id')
  if (upErr) return json({ error: upErr.message }, 500)
  if (!updated || updated.length === 0) return json({ error: 'Order was already updated' }, 409)

  // 4. Record the receipt on Arc. A failure here never undoes the confirmation.
  let txHash: string | null = null
  if (CONTRACT && RECORDER_KEY) {
    try {
      txHash = await recordOnArc(orderId)
      if (txHash) {
        await db.from('orders')
          .update({ arc_tx_hash: txHash, arc_recorded_at: new Date().toISOString() })
          .eq('id', orderId)
      }
    } catch (e) {
      console.error('Arc recording failed for order', orderId, String(e))
    }
  } else {
    console.error('Arc recording is not configured (missing secrets)')
  }

  return json({
    ok: true,
    arc_recorded: !!txHash,
    tx_hash: txHash,
    explorer_url: txHash ? `${EXPLORER}/tx/${txHash}` : null,
  })
})