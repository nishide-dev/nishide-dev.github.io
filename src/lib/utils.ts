import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge only knows Tailwind's stock scales. Our semantic type scale
 * shares the `text-*` prefix with text colours, so without this registration
 * `cn("text-title", "text-muted-foreground")` resolves to just the colour and
 * the size is silently dropped — every shadcn component funnels `className`
 * through `cn()`, so the whole scale would be unusable inside components.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: ["section", "entry"],
    },
    classGroups: {
      "font-size": [
        { text: ["label", "meta", "micro", "body", "title", "lead", "name"] },
      ],
      "max-w": [{ "max-w": ["page"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
