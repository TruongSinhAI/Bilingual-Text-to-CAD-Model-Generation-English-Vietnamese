"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2, Check, X, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none ring-offset-background relative overflow-hidden group",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md hover:border-accent-foreground/20",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl",
        glass: "backdrop-blur-md bg-white/10 border border-white/20 text-white hover:bg-white/20 shadow-lg",
        premium: "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10"
      },
      state: {
        default: "",
        loading: "cursor-wait opacity-70",
        success: "bg-green-600 hover:bg-green-700 text-white",
        error: "bg-red-600 hover:bg-red-700 text-white"
      },
      animation: {
        none: "",
        hover: "hover:scale-105 active:scale-95",
        pulse: "hover:animate-pulse",
        bounce: "hover:animate-bounce",
        shimmer: "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      state: "default",
      animation: "hover"
    }
  }
)

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  success?: boolean
  error?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  tooltip?: string
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    state,
    animation,
    asChild = false, 
    loading,
    success,
    error,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Determine current state
    const currentState = React.useMemo(() => {
      if (loading) return "loading"
      if (success) return "success"
      if (error) return "error"
      return state || "default"
    }, [loading, success, error, state])
    
    // Get appropriate icon
    const getStatusIcon = () => {
      if (loading) return <Loader2 className="w-4 h-4 animate-spin" />
      if (success) return <Check className="w-4 h-4" />
      if (error) return <X className="w-4 h-4" />
      return null
    }
    
    const statusIcon = getStatusIcon()
    const showLeftIcon = statusIcon || leftIcon
    const showRightIcon = !statusIcon && rightIcon

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, state: currentState, animation, className }),
          (loading || success || error) && "pointer-events-none"
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {/* Shimmer effect for premium variant */}
        {variant === "premium" && (
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        )}
        
        {/* Left icon */}
        {showLeftIcon && (
          <span className={cn("flex items-center", children && "mr-2")}>
            {statusIcon || leftIcon}
          </span>
        )}
        
        {/* Button content */}
        {children}
        
        {/* Right icon */}
        {showRightIcon && (
          <span className={cn("flex items-center", children && "ml-2")}>
            {rightIcon}
          </span>
        )}
        
        {/* Success ripple effect */}
        {success && (
          <div className="absolute inset-0 rounded-md bg-green-400/20 animate-ping" />
        )}
      </Comp>
    )
  }
)
EnhancedButton.displayName = "EnhancedButton"

export { EnhancedButton, buttonVariants }