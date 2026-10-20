import { useFlags } from '../lib/labprefs'
import { proofFor, communityFor, milestonesFor } from './site'

// Flag-aware content. Variants use these instead of the static exports so lab toggles apply everywhere.
export const useProof = () => proofFor(useFlags())
export const useCommunity = () => communityFor(useFlags())
export const useMilestones = () => milestonesFor(useFlags())
