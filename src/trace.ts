import type { InvokeResult } from './invoke.js';

export interface TraceEntry {
  id: number;
  timestamp: string;
  toolName: string;
  durationMs: number;
  isError: boolean;
  request: unknown;
  response: unknown;
}

function formatTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export function formatTrace(entry: TraceEntry): string {
  const status = entry.isError ? 'ERR' : 'OK';
  const header = `[${entry.timestamp}] tool: ${entry.toolName} (${entry.durationMs}ms) ${status}`;
  const req = `Request: ${JSON.stringify(entry.request, null, 2)}`;
  const res = `Response: ${JSON.stringify(entry.response, null, 2)}`;
  return `${header}\n${req}\n${res}`;
}

export function addToTrace(
  history: TraceEntry[],
  result: InvokeResult,
  toolName: string,
): TraceEntry {
  const entry: TraceEntry = {
    id: history.length + 1,
    timestamp: formatTimestamp(),
    toolName,
    durationMs: result.trace.durationMs,
    isError: result.isError,
    request: result.trace.request,
    response: result.trace.response,
  };
  history.push(entry);
  return entry;
}
