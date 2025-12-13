export const NAVIGATION_ORDER = ["about", "works", "works/microbase", "research"] as const

export type NavigationId = (typeof NAVIGATION_ORDER)[number]
