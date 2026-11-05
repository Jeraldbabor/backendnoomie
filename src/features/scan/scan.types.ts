import type { RecipeSummaryView } from '../recipes/recipes.types.js';

export type MatchConfidence = 'strong' | 'possible';

/** A recipe whose photo looks like the scanned photo. */
export interface ScanMatch {
  recipe: RecipeSummaryView;
  /** How alike the two photos look, from 0 to 1. A similarity, not a probability. */
  similarity: number;
  confidence: MatchConfidence;
}

/** Closest first. Empty when nothing looks similar enough. */
export interface ScanResult {
  matches: ScanMatch[];
}
