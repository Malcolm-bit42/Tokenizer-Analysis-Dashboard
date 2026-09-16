/* ─── API query helpers ─── */
export type languages_t = string[];
export type metric_t = 'all' | 'efficiency' | 'linguistic';

/* ─── Efficiency metrics (per language) ─── */
export interface EfficiencyMetrics {
  token_count: number;
  fertility: number;
  compression: number;
  token_premium: number;
}

/* ─── Linguistic metrics (per language) ─── */
export interface LinguisticMetrics {
  precision: number;
  recall: number;
  f1: number;
}

/* ─── Full metrics response from GET /tokenizer/metrics ─── */
export interface MetricsResponse {
  model_id: string;
  efficiency: Record<string, EfficiencyMetrics>;
  linguistic: Record<string, LinguisticMetrics>;
}

/* ─── Tokenize preview response from POST /tokenizer/preview ─── */
export interface TokenizeResponse {
  model_id: string;
  token_count: number;
  tokens: string[];
  token_ids: number[];
  offsets: [number, number][];
}

/* ─── Model summary from GET /tokenizer/summary/* ─── */
interface Summary {
  // model_id: string;
  avg_tokens:  number;
  avg_fertility: number;
  avg_compression: number;
  avg_f1: number;
  avg_precision: number;
  avg_recall: number
  avg_premium: number;
}

export interface TokenizePreviewMetrics {
  fertility: number;
  compression: number;
  token_count: number;
}

export type ModelSummary = Summary & { model_id: string };

export type LanguageSummary = Summary & {language: string};


/* ─── Language metadata ─── */
export interface LanguageInfo {
  code: string;
  backendName: string;
  displayName: string;
  family: 'nguni' | 'sotho-tswana' | 'other-bantu' | 'germanic';
  color: string;
  shortCode: string;
}

/* ─── Leaderboard row (Rank page) ─── */
export interface LeaderboardEntry {
  model_id: string;
  avg_fertility: number;
  avg_compression: number;
  avg_premium: number;
  avg_f1: number;
}