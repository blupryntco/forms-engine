import type { HTMLAttributes } from 'react'

import { cva, type VariantProps } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'

const badgeVariants = cva(
    'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors',
    {
        variants: {
            variant: {
                default: 'bg-gray-100 text-gray-600',
                secondary: 'bg-blue-50 text-blue-600',
                destructive: 'bg-red-50 text-red-600',
                outline: 'border border-gray-200 text-gray-600',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
)

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

const Badge = ({ className, variant, ...props }: BadgeProps) => (
    <span className={twMerge(badgeVariants({ variant }), className)} {...props} />
)

export { Badge, badgeVariants }
export type { BadgeProps }
