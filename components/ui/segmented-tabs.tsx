import { useId } from "react"
import { motion, LayoutGroup } from "framer-motion"
import clsx from "clsx"

type Item = { value: string; label: string; disabled?: boolean }

export function SegmentedTabs({
  value,
  onChange,
  items,
  className,
}: {
  value: string
  onChange: (v: string) => void
  items: Item[]
  className?: string
}) {
  const groupId = useId()

  return (
    <LayoutGroup id={groupId}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className={clsx(
          "relative flex w-full items-center gap-1",
          "rounded-full border border-gray-200 bg-white p-1 shadow-sm",
          "dark:border-gray-700 dark:bg-gray-800",
          "overflow-hidden", // ⬅️ ensure the blue pill never pokes out
          className
        )}
      >
        {items.map((it) => {
          const active = it.value === value
          return (
            <button
              key={it.value}
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${it.value}`}
              disabled={it.disabled}
              onClick={() => onChange(it.value)}
              className={clsx(
                "relative isolate flex-1 rounded-full px-4 md:px-5 h-10 md:h-12 text-sm md:text-base font-medium",
                "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200",
                "outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "whitespace-nowrap select-none"
              )}
            >
              {active && (
                <motion.span
                  layoutId="segmented-pill"
                  className="absolute inset-0 rounded-[inherit] bg-blue-600 shadow-sm"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className={clsx("relative z-10", active && "text-white")}>
                {it.label}
              </span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
