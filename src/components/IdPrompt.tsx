import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { KTick } from '@/components/Tick'
import { useIdPrompt, ID_FEE_NAIRA } from '@/hooks/useIdVerification'

const KEY = 'kasaja_id_prompt_until'
const DAYS = 3

function snoozed(): boolean {
  try { return Number(localStorage.getItem(KEY) ?? 0) > Date.now() } catch { return false }
}

/** Asks active people to get the black tick. Dismissible at the first threshold, permanent at the second. */
export default function IdPrompt() {
  const navigate = useNavigate()
  const prompt = useIdPrompt()
  const [hidden, setHidden] = useState(snoozed)

  if (!prompt) return null
  const required = prompt.level === 'required'
  if (!required && hidden) return null

  return (
    <div className="mx-3 mt-3 rounded-2xl p-3.5 flex items-center gap-3"
      style={{ background: 'var(--k-surface)', border: `1px solid ${required ? 'var(--k-accent)' : 'var(--k-line)'}` }}>
      <KTick kind="id" size={34} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold" style={{ color: 'var(--k-text)' }}>
          {required ? 'ID verification required' : 'Get your black tick'}
        </p>
        <p className="text-xs leading-snug" style={{ color: 'var(--k-muted)' }}>
          {required
            ? `You have passed ${prompt.threshold} ${prompt.what}. Withdrawals stay locked until your ID is verified.`
            : `Nice work: ${prompt.count} ${prompt.what}. Verify your ID for ₦${ID_FEE_NAIRA} and build trust.`}
        </p>
      </div>
      <button onClick={() => void navigate('/verify-id')} className="h-9 px-4 rounded-full text-xs font-extrabold shrink-0"
        style={{ background: 'var(--k-accent)', color: 'var(--k-on-accent)' }}>Verify</button>
      {!required && (
        <button aria-label="Not now" onClick={() => { try { localStorage.setItem(KEY, String(Date.now() + DAYS * 86400000)) } catch { /* ignore */ } setHidden(true) }}
          style={{ color: 'var(--k-muted)' }}><X size={16} /></button>
      )}
    </div>
  )
}
