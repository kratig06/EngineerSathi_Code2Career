import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { Resume, ResumeData, ResumeSource, normalizeResumeData, uid } from '@/lib/resume-types';

export type { Resume, ResumeData } from '@/lib/resume-types';

const STORAGE_KEY = 'engsaathi-resumes';

/**
 * Persistence: this app has no backend database or authentication, so resumes are stored
 * per-browser in localStorage (never sent to a server except transiently for AI analysis).
 * The storage wrapper records write failures (e.g. quota exceeded) so the UI can report
 * "not saved" instead of silently pretending success.
 */
let lastWriteError: string | null = null;

const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
      lastWriteError = null;
    } catch (e) {
      lastWriteError = e instanceof Error ? e.message : 'Storage write failed';
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export type SaveResult =
  | { ok: true; revision: number }
  | { ok: false; reason: 'conflict'; latest: Resume }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'storage'; message: string };

interface CreateInput {
  name: string;
  data: ResumeData;
  source: ResumeSource;
  parentId?: string;
  target?: { company: string; role: string };
}

export interface ResumeState {
  resumes: Resume[];
  createResume: (input: CreateInput) => Resume;
  /** Saves data only if `baseRevision` matches the stored revision (or `force` is set). */
  saveResumeData: (id: string, data: ResumeData, baseRevision: number, force?: boolean) => SaveResult;
  renameResume: (id: string, name: string) => SaveResult;
  deleteResume: (id: string) => { ok: boolean; message?: string };
  getResume: (id: string) => Resume | undefined;
}

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => ({
      resumes: [],

      createResume: ({ name, data, source, parentId, target }) => {
        const now = Date.now();
        const resume: Resume = {
          id: uid('res'),
          name: name.trim() || 'Untitled Resume',
          createdAt: now,
          updatedAt: now,
          revision: 1,
          source,
          parentId,
          target,
          data: normalizeResumeData(data),
        };
        set((s) => ({ resumes: [resume, ...s.resumes] }));
        return resume;
      },

      saveResumeData: (id, data, baseRevision, force = false) => {
        const current = get().resumes.find((r) => r.id === id);
        if (!current) return { ok: false, reason: 'not_found' };
        if (!force && current.revision !== baseRevision) {
          return { ok: false, reason: 'conflict', latest: current };
        }
        const revision = current.revision + 1;
        set((s) => ({
          resumes: s.resumes.map((r) => (r.id === id ? { ...r, data, revision, updatedAt: Date.now() } : r)),
        }));
        if (lastWriteError) return { ok: false, reason: 'storage', message: lastWriteError };
        return { ok: true, revision };
      },

      renameResume: (id, name) => {
        const current = get().resumes.find((r) => r.id === id);
        if (!current) return { ok: false, reason: 'not_found' };
        const revision = current.revision + 1;
        set((s) => ({
          resumes: s.resumes.map((r) => (r.id === id ? { ...r, name: name.trim(), revision, updatedAt: Date.now() } : r)),
        }));
        if (lastWriteError) return { ok: false, reason: 'storage', message: lastWriteError };
        return { ok: true, revision };
      },

      deleteResume: (id) => {
        if (!get().resumes.some((r) => r.id === id)) return { ok: false, message: 'Resume no longer exists.' };
        set((s) => ({ resumes: s.resumes.filter((r) => r.id !== id) }));
        if (lastWriteError) return { ok: false, message: lastWriteError };
        return { ok: true };
      },

      getResume: (id) => get().resumes.find((r) => r.id === id),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => safeLocalStorage),
      skipHydration: true,
      migrate: (persisted: unknown) => {
        const state = (persisted ?? {}) as { resumes?: unknown[] };
        const resumes = Array.isArray(state.resumes) ? state.resumes : [];
        return {
          resumes: resumes.map((r) => {
            const x = r as Record<string, unknown>;
            const ts = typeof x.updatedAt === 'number' ? x.updatedAt : typeof x.lastEdited === 'number' ? x.lastEdited : Date.now();
            return {
              id: String(x.id ?? uid('res')),
              name: String(x.name ?? 'Untitled Resume'),
              createdAt: typeof x.createdAt === 'number' ? x.createdAt : ts,
              updatedAt: ts,
              revision: typeof x.revision === 'number' ? x.revision : 1,
              source: (x.source as ResumeSource) ?? 'scratch',
              parentId: x.parentId as string | undefined,
              target: x.target as Resume['target'],
              data: normalizeResumeData(x.data),
            } satisfies Resume;
          }),
        };
      },
    },
  ),
);

let hydrationStarted = false;

/** Hydrate on the client only (avoids SSR mismatches) and keep tabs in sync. */
export function ensureResumeStoreHydrated() {
  if (typeof window === 'undefined' || hydrationStarted) return;
  hydrationStarted = true;
  void useResumeStore.persist.rehydrate();
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) void useResumeStore.persist.rehydrate();
  });
}
