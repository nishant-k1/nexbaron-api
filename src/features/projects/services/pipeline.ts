export type PipelineStage = 'inquiry' | 'proposal' | 'commit' | 'build' | 'delivery'

export function computeProjectStage(
  leadStatus: string,
  latestOrderStatus?: string,
  latestQuoteStatus?: string
): PipelineStage {
  if (latestOrderStatus === 'delivered') return 'delivery'
  if (latestOrderStatus === 'in_progress') return 'build'
  if (
    latestOrderStatus === 'paid' ||
    latestOrderStatus === 'pending' ||
    latestQuoteStatus === 'accepted'
  ) {
    return 'commit'
  }
  if (
    leadStatus === 'proposal' ||
    latestQuoteStatus === 'new' ||
    latestQuoteStatus === 'quoted'
  ) {
    return 'proposal'
  }
  return 'inquiry'
}

export const PIPELINE_STAGES: PipelineStage[] = ['inquiry', 'proposal', 'commit', 'build', 'delivery']

export const PIPELINE_LABELS: Record<PipelineStage, string> = {
  inquiry: 'Inquiry',
  proposal: 'Proposal',
  commit: 'Commit',
  build: 'Build',
  delivery: 'Delivery',
}
