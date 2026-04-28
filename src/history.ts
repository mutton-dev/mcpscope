import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';
import type { TraceEntry } from './trace.js';

const LICENSE_PATH = join(homedir(), '.mcpscope', 'license');
const DEFAULT_DB_PATH = join(homedir(), '.mcpscope', 'history.db');

export function isPro(): boolean {
  return existsSync(LICENSE_PATH);
}

export function openHistoryDb(dbPath: string = DEFAULT_DB_PATH): Database.Database {
  if (dbPath !== ':memory:') {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      pk INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      is_error INTEGER NOT NULL,
      request TEXT NOT NULL,
      response TEXT NOT NULL
    );
  `);
  return db;
}

export function saveHistory(db: Database.Database, entry: TraceEntry): void {
  db.prepare(
    `INSERT INTO history
     (entry_id, timestamp, tool_name, duration_ms, is_error, request, response)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    entry.id,
    entry.timestamp,
    entry.toolName,
    entry.durationMs,
    entry.isError ? 1 : 0,
    JSON.stringify(entry.request),
    JSON.stringify(entry.response),
  );
}

interface Row {
  entry_id: number;
  timestamp: string;
  tool_name: string;
  duration_ms: number;
  is_error: number;
  request: string;
  response: string;
}

export function getHistory(db: Database.Database, limit = 100): TraceEntry[] {
  const rows = db
    .prepare(
      `SELECT entry_id, timestamp, tool_name, duration_ms, is_error, request, response
       FROM history ORDER BY pk DESC LIMIT ?`,
    )
    .all(limit) as Row[];

  return rows.map((r) => ({
    id: r.entry_id,
    timestamp: r.timestamp,
    toolName: r.tool_name,
    durationMs: r.duration_ms,
    isError: r.is_error === 1,
    request: JSON.parse(r.request),
    response: JSON.parse(r.response),
  }));
}
