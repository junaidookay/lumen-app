/**
 * Real Debrid domain types — shared between server functions and client code.
 */

export interface RdTorrentInfo {
  id: string;
  filename: string;
  hash: string;
  status: "magnet_error" | "magnet_conversion" | "waiting_files_selection" | "queued" | "checking" | "downloading" | "downloaded" | "error" | "virus" | "compressing" | "uploading" | "dead";
  progress: number;
  files: Array<{
    id: number;
    path: string;
    bytes: number;
    selected: number;
  }>;
  links: string[];
}

export interface RdUnrestrictedLink {
  id: string;
  filename: string;
  mimeType: string;
  filesize: number;
  link: string;
  host: string;
  chunks: number;
  download: string;
  streamable: number;
}

export interface RdTorrentFile {
  id: number;
  path: string;
  bytes: number;
  selected: boolean;
}

export interface RdTorrent {
  id: string;
  filename: string;
  status: string;
  progress: number;
  links: string[];
  files: RdTorrentFile[];
  info_hash?: string;
}

export interface RdUserInfo {
  username: string;
  premium: number;
  expiration: string;
  points: number;
}

export interface StreamEpisode {
  season: number;
  episode: number;
  title: string;
  rd_link_index: number;
}

export interface StreamResolution {
  stream_url: string;
  source: "rd_dynamic" | "rd_stored" | "embed_fallback" | "legacy";
  episodes?: StreamEpisode[];
}

export interface RdResolveError {
  error: string;
  retryable: boolean;
  status?: string;
  progress?: number;
}

export interface TorrentResult {
  name: string;
  info_hash: string;
  magnet: string;
  seeders: number;
  sizeBytes: number;
  source: string;
}
