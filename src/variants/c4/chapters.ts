export type ChapterId = 'y2026' | 'y2025' | 'y2024' | 'photos' | 'contact'

/** The notebook's chapters, for the contents list, the desktop year rail and the phone's year chip. */
export const CHAPTERS: { id: ChapterId; label: string; place: string; toc: string }[] = [
  { id: 'y2026', label: '2026', place: 'Toronto', toc: 'Amazon, three instruments, a satellite' },
  { id: 'y2025', label: '2025', place: 'Victoria', toc: 'GPU search, the ocean from space' },
  { id: 'y2024', label: '2024', place: 'and earlier', toc: 'Kaggle, hackathons, UVic' },
  { id: 'photos', label: 'Photos', place: 'What I shoot', toc: 'Dusk, the moon, timelapses' },
]
