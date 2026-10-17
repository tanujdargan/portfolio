// The six stops on the drive. Pure data: imported by the SSR shell and by the world chunk.
import type { Mark } from '../../content/curated'

export type StationId = 'dock' | 'pad' | 'log' | 'model' | 'pier' | 'board'
/** Route order (the three proofs come first on the road too). */
export const STATION_IDS: StationId[] = ['dock', 'pad', 'log', 'model', 'pier', 'board']

export interface Station {
  id: StationId
  place: string // what it is on the road
  title: string // what it's about
  mark?: Mark
  color: string
  work?: 'amazon' | 'orbit' | 'lossmask' | 'steering' | 'ocean'
  slug?: string
}

export const STATIONS: Record<StationId, Station> = {
  dock: { id: 'dock', place: 'Downtown billboard', title: 'Amazon Robotics', mark: 'amazon', color: '#ffa066', work: 'amazon' },
  pad: { id: 'pad', place: 'Ground station', title: 'MarmotSat, in orbit', mark: 'cfar', color: '#7fe7ff', work: 'orbit' },
  log: { id: 'log', place: 'Tunnel', title: 'Loss masking and shutdown distress', mark: 'apart', color: '#ff9cbf', work: 'lossmask', slug: 'loss-masking-distress' },
  model: { id: 'model', place: 'Hairpins', title: 'Steering a language model', color: '#ffd27a', work: 'steering', slug: 'activation-steering' },
  pier: { id: 'pier', place: 'Lake pier', title: 'Ocean temperature from satellites', mark: 'uvic', color: '#6fe0cf', work: 'ocean', slug: 'ocean-sensing' },
  board: { id: 'board', place: 'Summit overlook', title: 'Experience and contact', color: '#f3d9b0' },
}
