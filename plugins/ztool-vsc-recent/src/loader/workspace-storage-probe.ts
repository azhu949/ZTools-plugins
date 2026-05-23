import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { RawEntry, SourceProbe } from '../types';

interface WorkspaceJson {
  folder?: string;     // single-folder workspace
  workspace?: string;  // .code-workspace file
}

function defaultRoot(): string {
  const platform = process.platform;
  if (platform === 'win32') {
    return path.join(process.env.APPDATA || '', 'Code', 'User', 'workspaceStorage');
  }
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'workspaceStorage');
  }
  return path.join(os.homedir(), '.config', 'Code', 'User', 'workspaceStorage');
}

interface DirEntry {
  hash: string;
  raw: RawEntry;
  mtimeMs: number;
}

export function createWorkspaceStorageProbe(rootOverride?: string): SourceProbe {
  const root = rootOverride ?? defaultRoot();
  return {
    name: 'workspaceStorage',
    async read(): Promise<RawEntry[] | null> {
      if (!fs.existsSync(root)) return null;
      let dirs: string[];
      try {
        dirs = fs.readdirSync(root);
      } catch {
        return null;
      }

      const collected: DirEntry[] = [];
      for (const hash of dirs) {
        const dir = path.join(root, hash);
        const wsJson = path.join(dir, 'workspace.json');
        try {
          if (!fs.statSync(dir).isDirectory()) continue;
          if (!fs.existsSync(wsJson)) continue;
          const text = fs.readFileSync(wsJson, 'utf-8');
          const parsed = JSON.parse(text) as WorkspaceJson;

          let raw: RawEntry | null = null;
          if (parsed.folder) {
            raw = { folderUri: parsed.folder };
          } else if (parsed.workspace) {
            raw = { workspace: { id: hash, configPath: parsed.workspace } };
          }
          if (!raw) continue;

          const mtimeMs = fs.statSync(dir).mtimeMs;
          collected.push({ hash, raw, mtimeMs });
        } catch {
          // skip malformed dir/file silently
        }
      }

      // most recently used first
      collected.sort((a, b) => b.mtimeMs - a.mtimeMs);
      return collected.map(c => c.raw);
    },
  };
}
