import type { ComponentType } from 'react'

// Versions 2–4 of this section for the review round. Version 1 is the current one in Home/index/Article.
// Reached at /gate/article2 … /gate/article4 (/gate/article2/research/<slug>).
export type Props = { slug: string }
export const versions: Record<string, ComponentType<Props>> = {}
