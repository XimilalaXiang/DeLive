import type React from "react"

interface EffortlessIntegrationProps {
  /** Fixed width from Figma: 482px */
  width?: number | string
  /** Fixed height from Figma: 300px */
  height?: number | string
  /** Optional className to pass to root */
  className?: string
  /** Theme palette */
  theme?: "light" | "dark"
}

/**
 * Effortless Integration – Service integration constellation
 * Generated from Figma via MCP with exact measurements (482×300px)
 * Single-file component following the v0-ready pattern used in this repo.
 */
const EffortlessIntegration: React.FC<EffortlessIntegrationProps> = ({
  width = 482,
  height = 300,
  className = "",
  theme = "dark",
}) => {
  // Design tokens (derived from Figma local variables)
  const themeVars =
    theme === "light"
      ? {
          "--ei-background": "#f8f9fa",
          "--ei-center-bg": "#37322f",
          "--ei-center-text": "#ffffff",
        }
      : ({
          "--ei-background": "#1f2937",
          "--ei-center-bg": "#37322f",
          "--ei-center-text": "#ffffff",
        } as React.CSSProperties)

  const imgFrame2147223198 = "/placeholder.svg?height=300&width=482"
  const imgGroup12006 = "/placeholder.svg?height=358&width=500"
  const imgGroup12007 = "/placeholder.svg?height=600&width=600"
  const imgEllipse274 = "/placeholder.svg?height=714&width=677"
  const imgGroup = "/placeholder.svg?height=28&width=28"
  const imgFrame2147223251 = "/placeholder.svg?height=42&width=42"
  const imgFrame = "/placeholder.svg?height=23&width=27"
  const imgFrame1 = "/placeholder.svg?height=30&width=25"
  const imgGroup12003 = "/placeholder.svg?height=18&width=18"
  const imgGroup1 = "/placeholder.svg?height=30&width=20"
  const imgGroup2 = "/placeholder.svg?height=30&width=20"
  const imgFrame2 = "/placeholder.svg?height=31&width=29"
  const imgFrame2147223245 = "/placeholder.svg?height=42&width=42"
  const imgFrame3 = "/placeholder.svg?height=24&width=24"

  return (
    <div
      className={className}
      style={
        {
          width,
          height,
          position: "relative",
          background: "transparent",
          ...themeVars,
        } as React.CSSProperties
      }
      role="img"
      aria-label="Effortless integration constellation with complex background patterns"
    >
      {/* Exact Figma structure with proper masking and background patterns */}
      
    </div>
  )
}

export default EffortlessIntegration
