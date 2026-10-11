import { cn } from '../../lib/utils'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: { outer: 'w-7 h-7 rounded-lg', text: 20, letter: 12 },
  md: { outer: 'w-9 h-9 rounded-xl', text: 26, letter: 16 },
  lg: { outer: 'w-16 h-16 rounded-2xl', text: 46, letter: 28 },
}

export default function KasajaLogo({ size = 'md', className }: Props) {
  const s = sizes[size]
  return (
    <div className={cn(s.outer, 'bg-brand-500 flex items-center justify-center flex-shrink-0 shadow-glow-sm', className)}>
      <svg width={s.text} height={s.text} viewBox="0 0 48 48" fill="none">
        <text x="8" y="36" fontFamily="Space Grotesk, system-ui" fontWeight="700"
          fontSize="34" fill="white" letterSpacing="-2">K</text>
      </svg>
    </div>
  )
}
