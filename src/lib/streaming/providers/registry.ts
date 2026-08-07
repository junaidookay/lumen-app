import type { StreamRequest, StreamingSource } from "../types";
import { realDebridProvider } from "./realdebrid";

export interface StreamingProvider {
  id: string;
  name: string;
  list: (req: StreamRequest) => Promise<StreamingSource[]>;
}

/**
 * Provider registry — RD only.
 * Embed fallbacks removed: caused thousands of CORS errors and aren't needed.
 */
const providers: StreamingProvider[] = [
  realDebridProvider,
];

export function listProviders(): StreamingProvider[] {
  return providers.slice();
}

export function getProvider(id: string): StreamingProvider | undefined {
  return providers.find((p) => p.id === id);
}
