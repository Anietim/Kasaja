// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const body = await req.text()
  const sig = req.headers.get('x-paystack-signature') ?? ''
  const hash = createHmac('sha512', PAYSTACK_SECRET).update(body).digest('hex')

  if (hash !== sig) {
    console.error('Invalid Paystack signature')
    return new Response('Unauthorized', { status: 401 })
  }

  const event = JSON.parse(body)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  if (event.event === 'charge.success') {
    const { reference, metadata, amount, customer } = event.data
    const amountNaira = amount / 100
    const type = metadata?.type ?? 'order_payment'
    const userId = metadata?.user_id
    const orderId = metadata?.order_id
    const groupId = metadata?.group_id
    const verificationId = metadata?.verification_id
    const deliveryId = metadata?.delivery_id

    console.log(`Payment confirmed: ${reference} — ₦${amountNaira} — type: ${type}`)

    // ID verification fee: confirmed by one shared database function (also used by verify-payment).
    if (type === 'id_verification' && userId) {
      const { data: result, error: idErr } = await supabase.rpc('confirm_id_payment', { p_user: userId, p_ref: reference, p_amount: amount })
      if (idErr) console.error('confirm_id_payment failed (run payment-confirmation.sql):', idErr.message)
      else console.log('ID payment', reference, result)
      return new Response('OK', { status: 200 })
    }

    // Paystack can send the same event more than once. Only act the first time we see a reference.
    const { error: dupErr } = await supabase.from('processed_payments').insert({ reference, kind: type })
    if (dupErr && dupErr.code === '23505') {
      console.log('Duplicate event ignored:', reference)
      return new Response('ok', { status: 200 })
    }
    if (dupErr) console.error('processed_payments check failed (run verification-setup.sql):', dupErr.message)

        const orderIds: string[] = metadata?.order_ids ?? (orderId ? [orderId] : [])
    if (type === 'order_payment' && orderIds.length > 0) {
      const { data: rows } = await supabase.from('orders').select('id, total_kobo').in('id', orderIds)
      const expected = (rows ?? []).reduce((s, r) => s + Number(r.total_kobo), 0)
      if (!rows || rows.length !== orderIds.length || amount < expected) {
        console.error('Amount mismatch for', reference)
        return new Response('ok', { status: 200 })
      }
      await supabase.from('orders').update({ status: 'paid', paystack_ref: reference }).in('id', orderIds).eq('status', 'pending')
    }

    if (type === 'group_subscription' && groupId && userId) {
      const tier = metadata?.tier ?? 'monthly'
      const daysMap: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 }
      const days = daysMap[tier] ?? 30
      const expiresAt = new Date(Date.now() + days * 86400000).toISOString()
      await supabase.from('group_subscriptions').upsert({
        user_id: userId, group_id: groupId, tier, expires_at: expiresAt, payment_ref: reference,
      }, { onConflict: 'user_id,group_id' })
      await supabase.from('notifications').insert({
        user_id: userId, type: 'subscription_active',
        title: 'Group Access Unlocked', body: `Your ${tier} subscription is now active.`,
        data: { group_id: groupId },
      })
    }

    if (type === 'verification_payment' && verificationId && userId) {
      await supabase.from('verification_applications')
        .update({ status: 'under_review', payment_ref: reference, payment_amount: amountNaira })
        .eq('id', verificationId)
      await supabase.from('notifications').insert({
        user_id: userId, type: 'verification_submitted',
        title: 'Verification Submitted', body: 'Your verification payment was received. An agent will contact you within 3–5 business days.',
        data: { verification_id: verificationId },
      })
      await supabase.rpc('notify_staff', { p_title: 'Verification paid', p_body: `A user paid ₦${amountNaira.toLocaleString()} for verification (${type}).`, p_link: '/admin/verifications' })
    }

    if (type === 'wallet_topup' && userId) {
      await supabase.from('wallet_transactions').insert({
        user_id: userId, type: 'credit', amount: amountNaira,
        label: 'Wallet Top-Up', reference, status: 'completed',
        metadata: { email: customer.email },
      })
      await supabase.from('profiles').rpc('increment_balance', { uid: userId, amount: amountNaira })
      await supabase.from('notifications').insert({
        user_id: userId, type: 'wallet_topup',
        title: 'Wallet Funded', body: `₦${amountNaira.toLocaleString()} added to your Kaja wallet.`,
        data: { ref: reference },
      })
    }

    if (type === 'delivery_escrow' && deliveryId && userId) {
      await supabase.from('delivery_requests').update({ status: 'paid', payment_ref: reference }).eq('id', deliveryId)
      await supabase.from('notifications').insert({
        user_id: userId, type: 'delivery_paid',
        title: 'Delivery Escrow Locked', body: 'Your delivery payment is held in escrow. The rider will proceed to pickup.',
        data: { delivery_id: deliveryId },
      })
    }
  }

  if (event.event === 'transfer.success') {
    const { reference, amount, recipient } = event.data
    const amountNaira = amount / 100
    const userId = recipient?.metadata?.user_id
    if (userId) {
      await supabase.from('wallet_transactions').insert({
        user_id: userId, type: 'debit', amount: amountNaira,
        label: 'Withdrawal', reference, status: 'completed',
        metadata: { bank: recipient.details?.bank_name, account: recipient.details?.account_number },
      })
      await supabase.from('notifications').insert({
        user_id: userId, type: 'withdrawal_success',
        title: 'Withdrawal Successful', body: `₦${amountNaira.toLocaleString()} sent to your bank account.`,
        data: { ref: reference },
      })
    }
  }

  if (event.event === 'transfer.failed') {
    const { reference, recipient } = event.data
    const userId = recipient?.metadata?.user_id
    if (userId) {
      await supabase.from('notifications').insert({
        user_id: userId, type: 'withdrawal_failed',
        title: 'Withdrawal Failed', body: 'Your withdrawal could not be processed. Contact support.',
        data: { ref: reference },
      })
    }
  }

  return new Response('OK', { status: 200 })
})
