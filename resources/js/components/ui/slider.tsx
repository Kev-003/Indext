import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends Omit<React.ComponentProps<"input">, 'value' | 'onChange'> {
  values?: number[]
  onValuesChange?: (values: number[]) => void
  min?: number
  max?: number
  step?: number
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, values = [0], onValuesChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    return (
      <input
        type="range"
        ref={ref}
        data-slot="slider"
        className={cn(
          "w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary",
          className
        )}
        value={values[0]}
        onChange={(e) => {
          const newValue = parseInt(e.target.value, 10)
          onValuesChange?.([newValue])
        }}
        min={min}
        max={max}
        step={step}
        {...props}
      />
    )
  }
)

Slider.displayName = "Slider"

export { Slider }
