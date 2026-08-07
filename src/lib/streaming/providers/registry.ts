import type { StreamRequest, StreamingSource } from "../types";
import { realDebridProvider } from "./realdebrid";
import { embedFallbackProvider } from "./embed-fallback";

export interface StreamingProvider {
  id: string;
  name: string;
  list: (req: StreamRequest) => Promise<StreamingSource[]>;
}

/**
 * Provider registry — RD first, then embed fallbacks.
 * Sample provider removed: it was masking real playback errors.
 */
const providers: StreamingProvider[] = [
  realDebridProvider,
  embedFallbackProvider,
];

export function listProviders(): StreamingProvider[] {
  return providers.slice();
}

export function getProvider(id: string): StreamingProvider | undefined {
  return providers.find((p) => p.id === id);
}
