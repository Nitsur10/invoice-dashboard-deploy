import Image from 'next/image'
import { cn } from '@/lib/utils'

interface RPDLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon'
}

const sizeClasses = {
  sm: 'h-6 w-auto',
  md: 'h-8 w-auto',
  lg: 'h-10 w-auto',
  xl: 'h-12 w-auto',
}

export function RPDLogo({ 
  className, 
  size = 'md',
  variant = 'full'
}: RPDLogoProps) {
  const sizeClass = sizeClasses[size]
  
  return (
    <div className={cn("relative", className)}>
      {/* Light theme logo */}
      <Image
        src="/logos/rpd-logo-light.svg"
        alt="RPD - The Powerhouse of Real Estate"
        width={200}
        height={60}
        className={cn(
          sizeClass,
          "block dark:hidden object-contain"
        )}
        priority
      />
      
      {/* Dark theme logo */}
      <Image
        src="/logos/rpd-logo-dark.svg"
        alt="RPD - The Powerhouse of Real Estate"
        width={200}
        height={60}
        className={cn(
          sizeClass,
          "hidden dark:block object-contain"
        )}
        priority
      />
    </div>
  )
}