export const NAVIGATION_ORDER = ["about", "works", "works/microbase", "works/tti-kde-homepage", "research"] as const

export type NavigationId = (typeof NAVIGATION_ORDER)[number]
