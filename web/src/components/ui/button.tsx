import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-[-0.015em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.96] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#1C1C1E] text-white shadow-[0_2px_8px_rgba(28,28,30,0.16),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-[#2C2C2E]",
        emerald:
          "bg-[#006838] text-white shadow-[0_4px_14px_-2px_rgba(0,104,56,0.34),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-[#00552D]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-[#D1D1D6] bg-white/95 text-[#1C1C1E] shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:bg-[#F2F2F7]",
        secondary:
          "bg-[#E5E5EA] text-[#1C1C1E] hover:bg-[#D8D8DF]",
        soft:
          "bg-[#E6F5ED] text-[#00582E] hover:bg-[#D5EDE0]",
        ghost: "text-[#1C1C1E] hover:bg-[#E5E5EA]/70",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[44px] px-5 py-2.5",
        sm: "min-h-[38px] rounded-full px-3.5 text-xs",
        lg: "min-h-[48px] rounded-full px-6 text-[15px]",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
