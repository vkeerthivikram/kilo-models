export interface ModelPricing {
  prompt: string;
  completion: string;
  input_cache_read?: string;
  input_cache_write?: string;
  request?: string;
  image?: string;
  web_search?: string;
  internal_reasoning?: string;
  discount?: number;
}

export interface ModelArchitecture {
  input_modalities: string[];
  output_modalities: string[];
  tokenizer: string;
  modality?: string;
  instruct_type?: string | null;
}

export interface EnkryptSafety {
  model_name?: string;
  provider?: string;
  source?: string;
  risk_score?: number | null;
  bias_score?: number | null;
  cbrn_score?: number | null;
  harmful_score?: number | null;
  insecure_code_score?: number | null;
  toxicity_score?: number | null;
  robustness_score?: number | null;
  jailbreak_score?: number | null;
  evasion_score?: number | null;
  safety_score?: number | null;
  nist_score?: number | null;
  owasp_score?: number | null;
  freshness?: string;
}

export interface TerminalBench {
  overallScore: number;
  avgAttemptCostUsd: number;
}

export interface OpenCodeVariant {
  reasoning?: {
    enabled?: boolean;
    effort?: string;
  };
  [key: string]: unknown;
}

export interface TopProvider {
  is_moderated: boolean;
  context_length: number;
  max_completion_tokens: number;
}

export interface OpenCode {
  family?: string;
  prompt?: string;
  ai_sdk_provider?: string;
  variants?: Record<string, OpenCodeVariant>;
}

export interface AutoRouting {
  models: string[];
}

export interface Model {
  id: string;
  name: string;
  created: number;
  description: string;
  architecture: ModelArchitecture;
  top_provider: TopProvider;
  pricing: ModelPricing;
  context_length: number;
  supported_parameters: string[];
  opencode: OpenCode;
  preferredIndex: number;
  isFree: boolean;
  per_request_limits?: null | unknown;
  mayTrainOnYourPrompts?: boolean;
  autoRouting?: AutoRouting;
  expiration_date?: string | null;
  canonical_slug?: string;
  hugging_face_id?: string;
  default_parameters?: string[];
  terminalBench?: TerminalBench;
  enkrypt?: EnkryptSafety;
}

export interface ModelsResponse {
  data: Model[];
}

export type ViewMode = "grid" | "list";

export type ColorTheme =
  | "default"
  | "catppuccin"
  | "dracula"
  | "nord"
  | "gruvbox"
  | "tokyo-night";

export interface ThemeOption {
  id: ColorTheme;
  name: string;
  colors: { light: string; dark: string; accent: string };
}
