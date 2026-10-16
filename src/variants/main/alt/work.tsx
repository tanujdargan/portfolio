import type { ComponentType } from 'react'

// Versions 2–4 of this section for the review round. Version 1 is the current one in Home/index/Article.
// Reached at /gate/work2 … /gate/work4.
export type Props = { depth: 'live' | 'open' | 'preview'; steeringInHero: boolean }
export const versions: Record<string, ComponentType<Props>> = {}
