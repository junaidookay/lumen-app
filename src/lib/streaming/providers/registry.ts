import type { StreamRequest, StreamingSource } from "../types";
import { sampleProvider } from "./sample";
import { realDebridProvider } from "./realdebrid";
import { embedFallbackProvider } from "./embed-fallback";

export interface StreamingProvider {
  id: string;
  name: string;
  list: (req: StreamRequest) => Promise<StreamingSource[]>;
}

/**
 * Provider registry. Providers are tried in order — RD first, then embeds, then sample.
 */
const providers: StreamingProvider[] = [
  realDebridProvider,
  embedFallbackProvider,
  sampleProvider,
];

export function listProviders(): StreamingProvider[] {
  return providers.slice();
}

export function getProvider(id: string): StreamingProvider | undefined {
  return providers.find((p) => p.id === id);
}
