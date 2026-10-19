import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

// A rider sends their own price for a delivery job.
export default function RiderCounterButton({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')

  async function send() {
    const kobo = Math.round(Number(amount) * 100)
    if (!kobo || kobo < 30000) { toast.error('Enter a price of at least ₦300'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('delivery_bids').insert({ request_id: jobId, rider_id: user?.id, amount_kobo: kobo })
    if (error) { toast.error(error.message); return }
    toast.success('Your price was sent to the seller')
    setOpen(false)
    setAmount('')
  }

  return (
    <div className="mt-3">
      <button onClick={() => setOpen(o => !o)} className="text-sm font-semibold text-brand-400">
        {open ? 'Cancel' : 'Counter with my price'}
      </button>
      {open && (
        <div className="flex gap-2 mt-2">
          <input
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            placeholder="Your price in ₦"
            className="flex-1 bg-surface-800 rounded-xl px-3 py-2 text-white text-sm"
          />
          <button onClick={() => void send()} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-bold">Send</button>
        </div>
      )}
    </div>
  )
}