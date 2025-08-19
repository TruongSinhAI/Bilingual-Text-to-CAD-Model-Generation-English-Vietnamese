"use client"

import * as React from "react"
import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface InteractiveSliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  label: string
  min?: number
  max?: number
  step?: number
  unit?: string
  precision?: number
  className?: string
  showMinMax?: boolean
  color?: "default" | "primary" | "success" | "warning" | "danger"
}

const colorVariants = {
  default: "from-gray-200 to-gray-300 bg-primary",
  primary: "from-blue-200 to-blue-300 bg-blue-600",
  success: "from-green-200 to-green-300 bg-green-600",
  warning: "from-yellow-200 to-yellow-300 bg-yellow-600",
  danger: "from-red-200 to-red-300 bg-red-600"
}

export const InteractiveSlider: React.FC<InteractiveSliderProps> = ({
  value,
  onValueChange,
  label,
  min = 0,
  max = 1,
  step = 0.1,
  unit = "",
  precision = 2,
  className,
  showMinMax = true,
  color = "default"
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const formatValue = (val: number) => {
    return val.toFixed(precision) + unit
  }

  const percentage = ((value[0] - min) / (max - min)) * 100

  return (
    <div 
      className={cn("space-y-3 relative", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <Label className={cn(
          "text-sm font-medium transition-colors duration-200",
          isDragging ? "text-primary" : "text-foreground"
        )}>
          {label}
        </Label>
        <div className={cn(
          "text-sm font-mono transition-all duration-200",
          isDragging ? "text-primary scale-110" : "text-muted-foreground",
          isHovered && !isDragging && "text-foreground"
        )}>
          {formatValue(value[0])}
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <Slider
          value={value}
          onValueChange={onValueChange}
          onPointerDown={() => setIsDragging(true)}
          onPointerUp={() => setIsDragging(false)}
          min={min}
          max={max}
          step={step}
          className={cn(
            "transition-all duration-200",
            isDragging && "scale-105",
            isHovered && !isDragging && "scale-102"
          )}
        />
        
        {/* Visual progress indicator */}
        <div className="mt-2 h-1 rounded-full overflow-hidden bg-gradient-to-r from-muted to-muted/50">
          <div 
            className={cn(
              "h-full transition-all duration-300 ease-out rounded-full",
              `bg-gradient-to-r ${colorVariants[color]}`,
              isDragging && "animate-pulse"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Min/Max indicators */}
      {showMinMax && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatValue(min)}</span>
          <span>{formatValue(max)}</span>
        </div>
      )}

      {/* Real-time feedback tooltip */}
      {isDragging && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-10">
          <div className="bg-popover text-popover-foreground px-2 py-1 rounded-md shadow-md text-xs font-medium animate-in slide-in-from-top-1">
            {formatValue(value[0])}
          </div>
        </div>
      )}
    </div>
  )
}