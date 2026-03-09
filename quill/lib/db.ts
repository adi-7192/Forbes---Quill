// lib/db.ts
// Using Node.js built-in experimental SQLite (available in Node 22.5.0+)
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

let db: any = null;

export function getDb() {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'quill_audit.db');
  
  // DatabaseSync is the current implementation in node:sqlite
  db = new DatabaseSync(dbPath);

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      article_text TEXT,
      metadata TEXT,
      safety_flags TEXT,
      timestamp TEXT,
      prompt_version TEXT
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      audit_log_id TEXT,
      article_text TEXT,
      metadata TEXT,
      rating TEXT,
      corrections TEXT,
      timestamp TEXT
    );
  `);

  return db;
}

export function logAudit(data: {
  id: string;
  article_text: string;
  metadata: any;
  safety_flags: any;
  timestamp: string;
  prompt_version: string;
}) {
  const database = getDb();
  const insert = database.prepare(`
    INSERT INTO audit_logs (id, article_text, metadata, safety_flags, timestamp, prompt_version)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  insert.run(
    data.id,
    data.article_text,
    JSON.stringify(data.metadata),
    JSON.stringify(data.safety_flags),
    data.timestamp,
    data.prompt_version
  );
}

export function logFeedback(data: {
  id: string;
  audit_log_id?: string;
  article_text: string;
  metadata: any;
  rating: string;
  corrections?: any;
  timestamp: string;
}) {
  const database = getDb();
  const insert = database.prepare(`
    INSERT INTO feedback (id, audit_log_id, article_text, metadata, rating, corrections, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  insert.run(
    data.id,
    data.audit_log_id || null,
    data.article_text,
    JSON.stringify(data.metadata),
    data.rating,
    JSON.stringify(data.corrections || []),
    data.timestamp
  );
}
