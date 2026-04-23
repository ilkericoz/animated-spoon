import { cn } from "@/lib/utils"

type Props = {
  size?: number
  className?: string
  /** When true, all four squares share a single accent tone — a quieter mark */
  monochrome?: boolean
}

export function AldiLogo({ size = 28, className, monochrome = false }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="ALDI Rescue"
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="7" fill="var(--aldi-navy)" />
      <g transform="translate(7 7)">
        <rect
          x="0"
          y="0"
          width="8"
          height="8"
          rx="1.5"
          fill={monochrome ? "var(--aldi-blue)" : "var(--aldi-blue)"}
        />
        <rect
          x="10"
          y="0"
          width="8"
          height="8"
          rx="1.5"
          fill={monochrome ? "var(--aldi-blue)" : "var(--aldi-orange)"}
          opacity={monochrome ? 0.75 : 1}
        />
        <rect
          x="0"
          y="10"
          width="8"
          height="8"
          rx="1.5"
          fill={monochrome ? "var(--aldi-blue)" : "var(--aldi-yellow)"}
          opacity={monochrome ? 0.55 : 1}
        />
        <rect
          x="10"
          y="10"
          width="8"
          height="8"
          rx="1.5"
          fill={monochrome ? "var(--aldi-blue)" : "var(--aldi-red)"}
          opacity={monochrome ? 0.4 : 1}
        />
      </g>
    </svg>
  )
}
