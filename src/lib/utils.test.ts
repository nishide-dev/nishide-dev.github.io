import { describe, expect, it } from "vitest"

import { cn } from "@/lib/utils"

describe("cn", () => {
  // Without extendTailwindMerge these all lose a class: the custom `text-*`
  // names look like text colours, and `section`/`entry`/`page` are unknown
  // spacing and max-width values.
  it("keeps a semantic size alongside a colour", () => {
    expect(cn("text-title", "text-muted-foreground")).toBe(
      "text-title text-muted-foreground"
    )
    expect(cn("text-primary", "text-title")).toBe("text-primary text-title")
  })

  it("treats the semantic sizes as font sizes, not colours", () => {
    expect(cn("text-sm", "text-body")).toBe("text-body")
    expect(cn("text-body", "text-lead")).toBe("text-lead")
    expect(cn("text-muted-foreground", "text-foreground")).toBe(
      "text-foreground"
    )
  })

  it("dedupes the custom spacing and width scales", () => {
    expect(cn("mt-section", "mt-4")).toBe("mt-4")
    expect(cn("mt-entry", "mt-section")).toBe("mt-section")
    expect(cn("max-w-page", "max-w-2xl")).toBe("max-w-2xl")
    expect(cn("max-w-2xl", "max-w-page")).toBe("max-w-page")
  })
})
