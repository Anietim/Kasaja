import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Props {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-16', className)}>
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-surface-overlay flex items-center justify-center mb-4">
          <Icon size={28} className="text-neutral-500" />
        </div>
      )}
      <h3 className="font-display font-semibold text-white text-lg mb-1">{title}</h3>
      {description && <p className="text-neutral-400 text-sm max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  )
}
