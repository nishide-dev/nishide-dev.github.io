import type * as React from "react"

/**
 * A list that keeps its list semantics.
 *
 * Preflight sets `list-style: none` on every `ul`/`ol`, and WebKit responds by
 * removing the list role from the accessibility tree — VoiceOver announces the
 * entries as loose text, with no "list, N items" boundary and no rotor entry.
 * `role="list"` is redundant per spec and load-bearing in practice, so it lives
 * here once rather than being re-argued at every call site.
 */
export function PlainList({
  as: Tag = "ul",
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"ul"> & { as?: "ul" | "ol" }) {
  return (
    <Tag className={className} role="list" {...props}>
      {children}
    </Tag>
  )
}
