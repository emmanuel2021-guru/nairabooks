import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-[-0.01em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#1C1C1E] text-white",
        secondary:
          "border-transparent bg-[#E5E5EA] text-[#1C1C1E]",
        emerald:
          "border-[#BDE5CF] bg-[#E6F5ED] text-[#00582E]",
        amber:
          "border-[#F5DDA3] bg-[#FEF9E6] text-[#784507]",
        iosBlue:
          "border-[#BFDBFE] bg-[#EAF3FC] text-[#0F4C81]",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-[#D1D1D6] bg-white text-[#1C1C1E]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
