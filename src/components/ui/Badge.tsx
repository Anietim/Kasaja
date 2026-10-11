import { ShieldCheck, TrendingUp, Award } from 'lucide-react'
import { cn } from '../../lib/utils'

interface VerifiedBadgeProps { className?: string }
interface TrendingBadgeProps { className?: string }
interface SecuredBadgeProps  { className?: string }

export function VerifiedBadge({ className }: VerifiedBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
      'bg-blue-500/15 text-blue-400 border border-blue-500/25',
      className
    )}>
      <ShieldCheck size={10} /> Verified
    </span>
  )
}

export function TrendingBadge({ className }: TrendingBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
      'bg-brand-500/15 text-brand-400 border border-brand-500/25',
      className
    )}>
      <TrendingUp size={10} /> Trending
    </span>
  )
}

export function SecuredBadge({ className }: SecuredBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
      'bg-success/15 text-success border border-success/25',
      className
    )}>
      <Award size={10} /> Secured
    </span>
  )
}

interface StarRatingProps { score: number; count: number; size?: 'sm' | 'md' }

export function StarRating({ score, count, size = 'sm' }: StarRatingProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 font-mono tabular-nums',
      size === 'sm' ? 'text-xs' : 'text-sm'
    )}>
      <span className="text-yellow-400">★</span>
      <span className="text-white font-semibold">{score.toFixed(1)}</span>
      <span className="text-neutral-500">({count})</span>
    </span>
  )
}
