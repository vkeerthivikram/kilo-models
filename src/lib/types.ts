export interface ModelPricing {
  prompt: string;
  completion: string;
  input_cache_read?: string;
  input_cache_write?: string;
  request?: string;
  image?: string;
  web_search?: string;
  internal_reasoning?: string;
}

export interface ModelArchitecture {
  input_modalities: string[];
  output_modalities: string[];
  tokenizer: string;
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
