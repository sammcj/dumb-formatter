import * as vscode from 'vscode'
import * as path from 'path'
import ignore, { type Ignore } from 'ignore'
import type { DumbFormatterConfig } from '../util/config'

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp', 'ico', 'svg',
  'pdf', 'zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar',
  'exe', 'dll', 'so', 'dylib', 'a', 'o', 'class', 'jar', 'war',
  'mp3', 'mp4', 'mov', 'avi', 'wav', 'flac', 'ogg', 'webm',
  'ttf', 'otf', 'woff', 'woff2', 'eot',
  'bin', 'iso', 'dmg', 'pkg', 'wasm',
  'sqlite', 'db',
])

export interface WalkOptions {
  include?: string
  cfg: DumbFormatterConfig
  token?: vscode.CancellationToken
}

export async function listWorkspaceFiles(opts: WalkOptions): Promise<vscode.Uri[]> {
  const include = opts.include ?? '**/*'
  const exclude = buildExcludeGlob(opts.cfg)
  const uris = await vscode.workspace.findFiles(include, exclude as vscode.GlobPattern, undefined, opts.token)
  if (opts.token?.isCancellationRequested) return []

  let filtered = uris
  if (opts.cfg.workspaceRespectGitignore) {
    filtered = await filterByGitignore(filtered)
  }
  if (opts.cfg.workspaceSkipBinaries) {
    filtered = filtered.filter((u) => !hasBinaryExtension(u))
    filtered = await filterByNullByteSniff(filtered, opts.token)
  }
  return filtered
}

export function buildExcludeGlob(cfg: DumbFormatterConfig): string | null | undefined {
  const patterns: string[] = []
  if (cfg.workspaceRespectVSCodeExcludes) {
    patterns.push(...activeGlobs('files.exclude'))
    patterns.push(...activeGlobs('search.exclude'))
  }
  patterns.push(...cfg.workspaceExclude)
  const unique = [...new Set(patterns)]
  if (unique.length === 0) {
    return cfg.workspaceRespectVSCodeExcludes ? undefined : null
  }
  if (unique.length === 1) return unique[0]
  return `{${unique.join(',')}}`
}

function activeGlobs(setting: string): string[] {
  const c = vscode.workspace.getConfiguration().get<Record<string, boolean>>(setting, {})
  return Object.entries(c).filter(([, on]) => on).map(([glob]) => glob)
}

function hasBinaryExtension(uri: vscode.Uri): boolean {
  const ext = path.extname(uri.fsPath).slice(1).toLowerCase()
  return ext.length > 0 && BINARY_EXTENSIONS.has(ext)
}

async function filterByNullByteSniff(uris: vscode.Uri[], token?: vscode.CancellationToken): Promise<vscode.Uri[]> {
  const out: vscode.Uri[] = []
  await Promise.all(
    uris.map(async (uri) => {
      if (token?.isCancellationRequested) return
      try {
        const head = await readHead(uri, 8192)
        if (head.includes(0)) return
        out.push(uri)
      } catch {
        out.push(uri)
      }
    }),
  )
  return out
}

async function readHead(uri: vscode.Uri, maxBytes: number): Promise<Uint8Array> {
  const bytes = await vscode.workspace.fs.readFile(uri)
  return bytes.length <= maxBytes ? bytes : bytes.subarray(0, maxBytes)
}

async function filterByGitignore(uris: vscode.Uri[]): Promise<vscode.Uri[]> {
  const folders = vscode.workspace.workspaceFolders ?? []
  if (folders.length === 0) return uris
  const matchers = await Promise.all(folders.map(loadGitignore))
  return uris.filter((uri) => {
    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i]
      const matcher = matchers[i]
      if (!matcher) continue
      const rel = path.relative(folder.uri.fsPath, uri.fsPath)
      if (rel.startsWith('..') || path.isAbsolute(rel)) continue
      const norm = rel.split(path.sep).join('/')
      if (matcher.ignores(norm)) return false
    }
    return true
  })
}

async function loadGitignore(folder: vscode.WorkspaceFolder): Promise<Ignore | null> {
  const candidate = vscode.Uri.joinPath(folder.uri, '.gitignore')
  try {
    const bytes = await vscode.workspace.fs.readFile(candidate)
    const ig = ignore()
    ig.add(new TextDecoder('utf-8').decode(bytes))
    return ig
  } catch {
    return null
  }
}
