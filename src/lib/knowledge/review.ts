import type {
  ExtractedRelationship,
  RelationshipReview,
} from '../../types/knowledge.ts'

export type RelationshipReviewDecision = 'accept' | 'reject'

export function reviewRelationship(
  relationship: ExtractedRelationship,
  decision: RelationshipReviewDecision,
  review: RelationshipReview,
): ExtractedRelationship {
  if (!review.reviewer.trim()) {
    throw new TypeError('A reviewer is required.')
  }

  if (!review.reviewedAt.trim()) {
    throw new TypeError('A review timestamp is required.')
  }

  const detail = review.detail ?? `${review.reviewer} ${decision}ed the relationship.`

  return {
    ...relationship,
    review: decision === 'accept' ? 'accepted' : 'rejected',
    verification: {
      status: decision === 'accept' ? 'verified' : 'rejected',
      method: 'manual-review',
      detail,
    },
  }
}
