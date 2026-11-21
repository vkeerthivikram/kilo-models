/** The gateway prefixes aliases with `~`; their IDs remain unchanged. */
export function normalizeProvider(provider: string): string {
  return provider.length > 1 && provider.startsWith("~") ? provider.slice(1) : provider;
}

export function getModelProvider(id: string): string {
  return normalizeProvider(id.split("/", 1)[0]);
}
