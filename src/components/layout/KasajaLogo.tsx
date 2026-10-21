import { cn } from '../../lib/utils'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: { box: 'w-7 h-7 rounded-lg', k: 18 },
  md: { box: 'w-9 h-9 rounded-xl', k: 24 },
  lg: { box: 'w-16 h-16 rounded-2xl', k: 42 },
}

/** The KASAJA "K": a heavy stem with two ribbon arms. Deep orange. No tile. */
export function KasajaK({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role="img" aria-label="KASAJA">
      <defs>
        <linearGradient id="kasaja-k" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="90" y2="100">
          <stop offset="0" stopColor="#FF6A13" />
          <stop offset="1" stopColor="#E24A00" />
        </linearGradient>
      </defs>
      <rect x="14" y="4" width="16" height="92" rx="4" fill="url(#kasaja-k)" />
      <path d="M30 49C46 42 58 30 62 14L87 8C82 34 60 50 30 56Z" fill="url(#kasaja-k)" />
      <path d="M30 56C46 62 58 74 62 90L87 96C82 70 60 54 30 49Z" fill="url(#kasaja-k)" />
    </svg>
  )
}

/** K on a black tile. Same component name and props as before, so existing imports keep working. */
export default function KasajaLogo({ size = 'md', className }: Props) {
  const s = sizes[size]
  return (
    <div
      className={cn(s.box, 'bg-black flex items-center justify-center flex-shrink-0')}
      style={{ border: '1px solid rgba(255,106,19,0.4)' }}
    >
      <KasajaK size={s.k} className={className} />
    </div>
  )
}
