import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-none border-2 px-2.5 py-0.5 text-xs font-bold uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 tracking-wider",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-black hover:bg-transparent hover:text-primary",
        secondary:
          "border-secondary bg-secondary text-black hover:bg-transparent hover:text-secondary",
        destructive:
          "border-destructive bg-destructive text-black hover:bg-transparent hover:text-destructive",
        outline: "text-foreground border-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }