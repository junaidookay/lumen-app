export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export interface ErrorContext {
  boundary?: string;
  route?: string;
  userId?: string;
  component?: string;
  [key: string]: unknown;
}

export interface CapturedError {
  id: string;
  error: Error;
  context: ErrorContext;
  severity: ErrorSeverity;
  timestamp: number;
  url?: string;
  userAgent?: string;
}

type ErrorSink = (error: CapturedError) => void;
const sinks: ErrorSink[] = [];
const recentErrors: CapturedError[] = [];
const MAX_RECENT = 50;

function generateId(): string {
  return `err-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function classifySeverity(error: Error): ErrorSeverity {
  const msg = error.message.toLowerCase();
  if (msg.includes("chunk") || msg.includes("loading")) return "medium";
  if (msg.includes("network") || msg.includes("fetch")) return "high";
  if (msg.includes("security") || msg.includes("auth")) return "critical";
  return "low";
}

export function captureError(
  error: unknown,
  context: ErrorContext = {},
): CapturedError | null {
  if (!(error instanceof Error)) return null;

  const captured: CapturedError = {
    id: generateId(),
    error,
    context,
    severity: classifySeverity(error),
    timestamp: Date.now(),
    url: typeof window !== "undefined" ? window.location.href : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };

  recentErrors.push(captured);
  if (recentErrors.length > MAX_RECENT) recentErrors.shift();

  for (const sink of sinks) {
    try {
      sink(captured);
    } catch {
      // Monitoring must never break the app
    }
  }

  return captured;
}

export function subscribeErrors(sink: ErrorSink): () => void {
  sinks.push(sink);
  return () => {
    const idx = sinks.indexOf(sink);
    if (idx >= 0) sinks.splice(idx, 1);
  };
}

export function getRecentErrors(): CapturedError[] {
  return [...recentErrors];
}

// Wire to console by default
subscribeErrors((err) => {
  console.error(`[monitoring:${err.severity}]`, err.error.message, err.context);
});
