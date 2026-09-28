// Content flags: things Tanuj hasn't decided to show yet. This file is the only switch for production.
// The lab can override them per session (dock toggles, or ?show=beri,vikelabs,cde) without touching this file.
export const contentFlags = {
  beri: true, // on since Sep 2026: described as a food app Tanuj is building (never 'co-founder')
  vikelabs: false,
  cde: false,
}
export type FlagKey = keyof typeof contentFlags
export type Flags = Record<FlagKey, boolean>
export const flagLabels: Record<FlagKey, string> = { beri: 'Beri', vikelabs: 'VikeLabs', cde: 'CDE 2026' }
