import * as fs from 'fs';
import type { RawEntry, RecentItem, SourceProbe } from '../types';
import { mapEntries } from '../uri-mapper';
import { createStateVscdbProbe } from './state-vscdb-probe';
import { createStorageJsonProbe } from './storage-json-probe';
import { createWorkspaceStorageProbe } from './workspace-storage-probe';

/**
 * 默认 probe 顺序：workspaceStorage 优先（完整列表，mtime 排序），state.vscdb 次之，storage.json 兜底。
 */
export function defaultProbes(): SourceProbe[] {
  return [
    createWorkspaceStorageProbe(),
    createStateVscdbProbe(),
    createStorageJsonProbe(),
  ];
}

export type ExistsCheck = (path: string) => boolean;

export interface LoadDiagnostic {
  probes: Array<{
    name: string;
    rawCount: number | null;          // null = probe returned null (skipped)
    error?: string;
  }>;
  mappedCount: number;                 // after uri-mapper
  finalCount: number;                  // after dedup + existsCheck filter
  droppedNonexistent: number;          // local items dropped because path missing
  examplePath?: string;                // first item's rawPath, for sanity check
}

export async function loadRecentDetailed(
  probes: SourceProbe[] = defaultProbes(),
  existsCheck: ExistsCheck = fs.existsSync,
): Promise<{ items: RecentItem[]; diag: LoadDiagnostic }> {
  const diag: LoadDiagnostic = {
    probes: [],
    mappedCount: 0,
    finalCount: 0,
    droppedNonexistent: 0,
  };

  const allRaw: RawEntry[] = [];
  for (const p of probes) {
    try {
      const entries = await p.read();
      diag.probes.push({ name: p.name, rawCount: entries === null ? null : entries.length });
      if (entries) allRaw.push(...entries);
    } catch (e) {
      diag.probes.push({ name: p.name, rawCount: null, error: e instanceof Error ? e.message : String(e) });
    }
  }

  const mapped = mapEntries(allRaw);
  diag.mappedCount = mapped.length;
  if (mapped.length > 0) diag.examplePath = mapped[0].rawPath;

  const seen = new Set<string>();
  const out: RecentItem[] = [];
  for (const item of mapped) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);

    if (item.kind === 'remote') {
      out.push({ ...item, exists: true });
      continue;
    }
    if (!existsCheck(item.rawPath)) {
      diag.droppedNonexistent++;
      continue;
    }
    out.push({ ...item, exists: true });
  }

  diag.finalCount = out.length;
  return { items: out, diag };
}

/**
 * 顺序读取所有 probe，合并 + 按 id 去重（保留首次出现）+ 本地路径存在性过滤。
 *
 * `existsCheck` 默认用 fs.existsSync；测试时可注入自定义谓词。
 */
export async function loadRecent(
  probes: SourceProbe[] = defaultProbes(),
  existsCheck: ExistsCheck = fs.existsSync,
): Promise<RecentItem[]> {
  const { items } = await loadRecentDetailed(probes, existsCheck);
  return items;
}
