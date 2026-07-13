import type { StreamRequest, StreamingSource } from "../types";
import { sampleProvider } from "./sample";

export interface StreamingProvider {
  id: string;
  name: string;
  list: (req: StreamRequest) => Promise<StreamingSource[]>;
}

/**
 * Provider registry. Add adapters here (Mux, JW, self-hosted, licensed CDN)
 * and the rest of the app immediately sees them — no UI or player changes.
 */
const providers: StreamingProvider[] = [sampleProvider];

export function listProviders(): StreamingProvider[] {
  return providers.slice();
}

export function getProvider(id: string): StreamingProvider | undefined {
  return providers.find((p) => p.id === id);
}