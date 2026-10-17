// The six stations on the island. Pure data: imported by the SSR shell and by the world chunk.
import type { Mark } from '../../content/curated'

export type StationId = 'dock' | 'pad' | 'log' | 'model' | 'pier' | 'board'
/** Rail order: the three proofs first. */
export const STATION_IDS: StationId[] = ['dock', 'pad', 'log', 'model', 'pier', 'board']

export interface Station {
  id: StationId
  place: string // what it is on the island
  title: string // what it's about
  mark?: Mark
  color: string
  /** curated `selected` id, when the station is one of the selected works */
  work?: 'amazon' | 'orbit' | 'lossmask' | 'steering' | 'ocean'
  slug?: string
}

export const STATIONS: Record<StationId, Station> = {
  dock: { id: 'dock', place: 'Warehouse dock', title: 'Amazon Robotics', mark: 'amazon', color: '#ffa066', work: 'amazon' },
  pad: { id: 'pad', place: 'Launch pad', title: 'MarmotSat, in orbit', mark: 'cfar', color: '#7fe7ff', work: 'orbit' },
  log: { id: 'log', place: 'Logbook', title: 'Loss masking and shutdown distress', mark: 'apart', color: '#ff9cbf', work: 'lossmask', slug: 'loss-masking-distress' },
  model: { id: 'model', place: 'The model', title: 'Steering a language model', color: '#ffd27a', work: 'steering', slug: 'activation-steering' },
  pier: { id: 'pier', place: 'Pier and buoy', title: 'Ocean temperature from satellites', mark: 'uvic', color: '#6fe0cf', work: 'ocean', slug: 'ocean-sensing' },
  board: { id: 'board', place: 'Signpost', title: 'Experience and contact', color: '#f3d9b0' },
}

/** Where each station sits on the prerendered poster stills, in % of the image (measured from the world camera). */
export const POSTER_PINS: Record<'d' | 'm', Partial<Record<StationId, [number, number]>>> = {
  d: { dock: [89, 29.5], pad: [50.5, 11.4], log: [31.6, 87.2], model: [75.7, 78.4], pier: [7.5, 37.4], board: [37.1, 46.5] },
  m: { pad: [39.2, 39.9], log: [34.2, 85.6], model: [82, 78.2], board: [28.8, 64] },
}
