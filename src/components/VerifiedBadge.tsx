import { ShieldCheck } from 'lucide-react'

type BadgeSize = 'xs' | 'sm' | 'md' | 'lg'

interface VerifiedBadgeProps {
  type?: 'store' | 'rider' | 'user'
  size?: BadgeSize
  showLabel?: boolean
  className?: string
}

const SIZE_MAP: Record<BadgeSize, { icon: number; text: string; px: string; py: string; gap: string }> = {
  xs: { icon: 10, text: 'text-[9px]', px: 'px-1.5', py: 'py-0.5', gap: 'gap-0.5' },
  sm: { icon: 12, text: 'text-[10px]', px: 'px-2', py: 'py-0.5', gap: 'gap-1' },
  md: { icon: 14, text: 'text-xs', px: 'px-2.5', py: 'py-1', gap: 'gap-1' },
  lg: { icon: 18, text: 'text-sm', px: 'px-3', py: 'py-1.5', gap: 'gap-1.5' },
}

const TYPE_MAP = {
  store: {
    label: 'Verified Store',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
    glow: 'rgba(124,58,237,0.35)',
    icon: '🛡️',
  },
  rider: {
    label: 'Verified Rider',
    gradient: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
    glow: 'rgba(16,185,129,0.35)',
    icon: '✅',
  },
  user: {
    label: 'Verified',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
    glow: 'rgba(99,102,241,0.35)',
    icon: '✓',
  },
}

export function VerifiedBadge({ type = 'store', size = 'sm', showLabel = false, className = '' }: VerifiedBadgeProps) {
  const s = SIZE_MAP[size]
  const t = TYPE_MAP[type]

  if (showLabel) {
    return (
      <span
        className={`inline-flex items-center rounded-full font-semibold text-white ${s.px} ${s.py} ${s.gap} ${s.text} ${className}`}
        style={{
          background: t.gradient,
          boxShadow: `0 2px 8px ${t.glow}`,
        }}
      >
        <ShieldCheck size={s.icon} strokeWidth={2.5} />
        {t.label}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-white ${className}`}
      style={{
        background: t.gradient,
        boxShadow: `0 2px 8px ${t.glow}`,
        width: s.icon + 8,
        height: s.icon + 8,
        minWidth: s.icon + 8,
      }}
      title={t.label}
    >
      <ShieldCheck size={s.icon} strokeWidth={2.5} />
    </span>
  )
}

// Inline usage next to a store name — icon only, no label
export function VerifiedIcon({ type = 'store', size = 'sm' }: { type?: 'store' | 'rider' | 'user'; size?: BadgeSize }) {
  return <VerifiedBadge type={type} size={size} showLabel={false} />
}

// Full pill badge — used on profile pages and store headers
export function VerifiedPill({ type = 'store', size = 'md' }: { type?: 'store' | 'rider' | 'user'; size?: BadgeSize }) {
  return <VerifiedBadge type={type} size={size} showLabel />
}
