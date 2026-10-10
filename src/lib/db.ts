/**
 * Server-side SQLite database using better-sqlite3.
 * The DB file lives at <project_root>/data/engsaathi.db (created on first run).
 * This module must NEVER be imported from client components.
 *
 * Thread safety: better-sqlite3 is synchronous and single-process safe.
 * For production multi-process deployments (e.g. Vercel), switch to an external
 * database by replacing the getDb() function and keeping the same schema shape.
 *
 * Environment variable DATABASE_URL can override the file path (e.g. for testing).
 */

import type Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = process.env.DATABASE_URL?.startsWith('file:')
    ? process.env.DATABASE_URL.slice(5)
    : path.resolve(process.cwd(), 'data', 'engsaathi.db');

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Dynamic require so Next.js doesn't try to bundle it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const BetterSqlite3 = require('better-sqlite3');
  _db = new BetterSqlite3(dbPath) as Database.Database;
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  migrate(_db);
  return _db;
}

/* ───────── Schema ───────── */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS profiles (
  id          TEXT    PRIMARY KEY,
  display_name TEXT   NOT NULL DEFAULT 'Guest',
  email       TEXT    NOT NULL DEFAULT '',
  avatar_url  TEXT    NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS interview_targets (
  id            TEXT    PRIMARY KEY,
  user_id       TEXT    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company       TEXT    NOT NULL,
  role          TEXT    NOT NULL,
  interview_at  INTEGER,           -- Unix epoch ms; NULL = no date set
  timezone      TEXT    NOT NULL DEFAULT 'UTC',
  job_description TEXT  NOT NULL DEFAULT '',
  notes         TEXT    NOT NULL DEFAULT '',
  status        TEXT    NOT NULL DEFAULT 'planning',
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  updated_at    INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE INDEX IF NOT EXISTS ix_targets_user ON interview_targets(user_id);

CREATE TABLE IF NOT EXISTS roadmaps (
  id          TEXT    PRIMARY KEY,
  user_id     TEXT    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id   TEXT    NOT NULL REFERENCES interview_targets(id) ON DELETE CASCADE,
  title       TEXT    NOT NULL,
  meta_json   TEXT    NOT NULL DEFAULT '{}',
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE INDEX IF NOT EXISTS ix_roadmaps_target ON roadmaps(target_id);

CREATE TABLE IF NOT EXISTS roadmap_tasks (
  id            TEXT    PRIMARY KEY,
  roadmap_id    TEXT    NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  sequence      INTEGER NOT NULL DEFAULT 0,
  title         TEXT    NOT NULL,
  description   TEXT    NOT NULL DEFAULT '',
  category      TEXT    NOT NULL DEFAULT 'general',
  planned_date  TEXT,             -- ISO date string YYYY-MM-DD; nullable
  completed     INTEGER NOT NULL DEFAULT 0,  -- 0 | 1
  completed_at  INTEGER,          -- Unix epoch ms
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE INDEX IF NOT EXISTS ix_tasks_roadmap ON roadmap_tasks(roadmap_id);

-- Seed the single guest profile used for the demo
INSERT OR IGNORE INTO profiles (id, display_name, email) VALUES ('guest', 'Karan', '');
`;

function migrate(db: Database.Database) {
  db.exec(SCHEMA);
}

/* ───────── Types ───────── */

export interface Profile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  createdAt: number;
  updatedAt: number;
}

export interface InterviewTarget {
  id: string;
  userId: string;
  company: string;
  role: string;
  interviewAt: number | null;
  timezone: string;
  jobDescription: string;
  notes: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

export interface Roadmap {
  id: string;
  userId: string;
  targetId: string;
  title: string;
  meta: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface RoadmapTask {
  id: string;
  roadmapId: string;
  sequence: number;
  title: string;
  description: string;
  category: string;
  plannedDate: string | null;
  completed: boolean;
  completedAt: number | null;
  createdAt: number;
}

/* ───────── Utility ───────── */

function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    displayName: row.display_name as string,
    email: row.email as string,
    avatarUrl: row.avatar_url as string,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

function mapTarget(row: Record<string, unknown>): InterviewTarget {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    company: row.company as string,
    role: row.role as string,
    interviewAt: row.interview_at != null ? (row.interview_at as number) : null,
    timezone: row.timezone as string,
    jobDescription: row.job_description as string,
    notes: row.notes as string,
    status: row.status as string,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

function mapRoadmap(row: Record<string, unknown>): Roadmap {
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(row.meta_json as string); } catch { /* ignore */ }
  return {
    id: row.id as string,
    userId: row.user_id as string,
    targetId: row.target_id as string,
    title: row.title as string,
    meta,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

function mapTask(row: Record<string, unknown>): RoadmapTask {
  return {
    id: row.id as string,
    roadmapId: row.roadmap_id as string,
    sequence: row.sequence as number,
    title: row.title as string,
    description: row.description as string,
    category: row.category as string,
    plannedDate: (row.planned_date as string | null) ?? null,
    completed: (row.completed as number) === 1,
    completedAt: (row.completed_at as number | null) ?? null,
    createdAt: row.created_at as number,
  };
}

/* ───────── Profile operations ───────── */

export function getProfile(userId: string): Profile | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(userId) as Record<string, unknown> | undefined;
  return row ? mapProfile(row) : null;
}

export function getOrCreateGuestProfile(): Profile {
  const db = getDb();
  let row = db.prepare('SELECT * FROM profiles WHERE id = ?').get('guest') as Record<string, unknown> | undefined;
  if (!row) {
    db.prepare('INSERT INTO profiles (id, display_name) VALUES (?, ?)').run('guest', 'Karan');
    row = db.prepare('SELECT * FROM profiles WHERE id = ?').get('guest') as Record<string, unknown>;
  }
  return mapProfile(row);
}

export function updateProfile(userId: string, data: { displayName?: string; email?: string; avatarUrl?: string }): Profile | null {
  const db = getDb();
  const sets: string[] = ['updated_at = ?'];
  const vals: unknown[] = [Date.now()];
  if (data.displayName !== undefined) { sets.push('display_name = ?'); vals.push(data.displayName.trim() || 'Guest'); }
  if (data.email !== undefined) { sets.push('email = ?'); vals.push(data.email.trim()); }
  if (data.avatarUrl !== undefined) { sets.push('avatar_url = ?'); vals.push(data.avatarUrl); }
  vals.push(userId);
  db.prepare(`UPDATE profiles SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  return getProfile(userId);
}

/* ───────── Interview target operations ───────── */

export function listTargets(userId: string): InterviewTarget[] {
  const db = getDb();
  return (db.prepare('SELECT * FROM interview_targets WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Record<string, unknown>[]).map(mapTarget);
}

export function getTarget(userId: string, targetId: string): InterviewTarget | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM interview_targets WHERE id = ? AND user_id = ?').get(targetId, userId) as Record<string, unknown> | undefined;
  return row ? mapTarget(row) : null;
}

export interface CreateTargetInput {
  userId: string;
  company: string;
  role: string;
  interviewAt?: number | null;
  timezone?: string;
  jobDescription?: string;
  notes?: string;
  status?: string;
}

export function createTarget(input: CreateTargetInput): InterviewTarget {
  const db = getDb();
  const id = uid();
  const now = Date.now();
  db.prepare(
    'INSERT INTO interview_targets (id, user_id, company, role, interview_at, timezone, job_description, notes, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
  ).run(id, input.userId, input.company.trim(), input.role.trim(), input.interviewAt ?? null, input.timezone ?? 'UTC', input.jobDescription ?? '', input.notes ?? '', input.status ?? 'planning', now, now);
  return getTarget(input.userId, id)!;
}

export interface UpdateTargetInput {
  company?: string;
  role?: string;
  interviewAt?: number | null;
  timezone?: string;
  jobDescription?: string;
  notes?: string;
  status?: string;
}

export function updateTarget(userId: string, targetId: string, data: UpdateTargetInput): InterviewTarget | null {
  const db = getDb();
  const sets: string[] = ['updated_at = ?'];
  const vals: unknown[] = [Date.now()];
  if (data.company !== undefined) { sets.push('company = ?'); vals.push(data.company.trim()); }
  if (data.role !== undefined) { sets.push('role = ?'); vals.push(data.role.trim()); }
  if ('interviewAt' in data) { sets.push('interview_at = ?'); vals.push(data.interviewAt ?? null); }
  if (data.timezone !== undefined) { sets.push('timezone = ?'); vals.push(data.timezone); }
  if (data.jobDescription !== undefined) { sets.push('job_description = ?'); vals.push(data.jobDescription); }
  if (data.notes !== undefined) { sets.push('notes = ?'); vals.push(data.notes); }
  if (data.status !== undefined) { sets.push('status = ?'); vals.push(data.status); }
  vals.push(targetId, userId);
  db.prepare(`UPDATE interview_targets SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...vals);
  return getTarget(userId, targetId);
}

export function deleteTarget(userId: string, targetId: string): boolean {
  const db = getDb();
  const info = db.prepare('DELETE FROM interview_targets WHERE id = ? AND user_id = ?').run(targetId, userId);
  return info.changes > 0;
}

/* ───────── Roadmap operations ───────── */

export function getRoadmap(userId: string, targetId: string): Roadmap | null {
  const db = getDb();
  const row = db.prepare('SELECT r.* FROM roadmaps r WHERE r.target_id = ? AND r.user_id = ?').get(targetId, userId) as Record<string, unknown> | undefined;
  return row ? mapRoadmap(row) : null;
}

export function getRoadmapTasks(roadmapId: string): RoadmapTask[] {
  const db = getDb();
  return (db.prepare('SELECT * FROM roadmap_tasks WHERE roadmap_id = ? ORDER BY sequence ASC').all(roadmapId) as Record<string, unknown>[]).map(mapTask);
}

export interface TaskInput {
  sequence: number;
  title: string;
  description?: string;
  category?: string;
  plannedDate?: string | null;
}

export function createOrReplaceRoadmap(userId: string, targetId: string, title: string, tasks: TaskInput[], preserveCompleted = false): Roadmap {
  const db = getDb();
  const now = Date.now();

  // Fetch any existing roadmap and completed tasks so we can optionally preserve them.
  const existing = getRoadmap(userId, targetId);
  const completedMap = new Map<string, { completed: boolean; completedAt: number | null }>();
  if (existing && preserveCompleted) {
    const existingTasks = getRoadmapTasks(existing.id);
    for (const t of existingTasks) {
      if (t.completed) completedMap.set(t.title.toLowerCase(), { completed: t.completed, completedAt: t.completedAt });
    }
  }

  db.transaction(() => {
    const roadmapId = existing?.id ?? uid();
    if (existing) {
      db.prepare('UPDATE roadmaps SET title = ?, updated_at = ? WHERE id = ?').run(title, now, roadmapId);
      if (!preserveCompleted) db.prepare('DELETE FROM roadmap_tasks WHERE roadmap_id = ?').run(roadmapId);
      else db.prepare('DELETE FROM roadmap_tasks WHERE roadmap_id = ? AND completed = 0').run(roadmapId);
    } else {
      db.prepare('INSERT INTO roadmaps (id, user_id, target_id, title, created_at, updated_at) VALUES (?,?,?,?,?,?)').run(roadmapId, userId, targetId, title, now, now);
    }
    const insertTask = db.prepare('INSERT OR REPLACE INTO roadmap_tasks (id, roadmap_id, sequence, title, description, category, planned_date, completed, completed_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
    for (const t of tasks) {
      const prev = preserveCompleted ? completedMap.get(t.title.toLowerCase()) : undefined;
      insertTask.run(uid(), roadmapId, t.sequence, t.title, t.description ?? '', t.category ?? 'general', t.plannedDate ?? null, prev ? 1 : 0, prev?.completedAt ?? null, now);
    }
  })();

  return getRoadmap(userId, targetId)!;
}

export function toggleTask(userId: string, taskId: string, completed: boolean): boolean {
  const db = getDb();
  // Verify ownership via join
  const task = db.prepare(`
    SELECT t.id FROM roadmap_tasks t
    JOIN roadmaps r ON r.id = t.roadmap_id
    WHERE t.id = ? AND r.user_id = ?
  `).get(taskId, userId) as { id: string } | undefined;
  if (!task) return false;
  db.prepare('UPDATE roadmap_tasks SET completed = ?, completed_at = ? WHERE id = ?').run(completed ? 1 : 0, completed ? Date.now() : null, taskId);
  return true;
}
