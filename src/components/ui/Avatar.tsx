import { cn, initials } from '../../lib/utils'

interface AvatarProps {
  url?: string | null
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
}

export default function Avatar({ url, name = 'U', size = 'md', className }: AvatarProps) {
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden',
      'bg-brand-500/20 text-brand-400 font-display font-semibold',
      sizeMap[size],
      className
    )}>
      {url
        ? <img src={url} alt={name} className="w-full h-full object-cover" />
        : initials(name)
      }
    </div>
  )
}
