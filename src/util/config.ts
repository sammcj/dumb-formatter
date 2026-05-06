import * as vscode from 'vscode'
import type { CategoryFlags } from '../transform/categories'

export const SECTION = 'dumb-formatter'

export type DiagnosticSeverity = 'error' | 'warning' | 'information' | 'hint'

export interface DumbFormatterConfig {
  categories: CategoryFlags
  emDashReplacement: '-' | '--'
  onSaveEnabled: boolean
  onPasteEnabled: boolean
  diagnosticsEnabled: boolean
  diagnosticsSeverity: DiagnosticSeverity
  maxFileSizeMB: number
  workspaceRespectGitignore: boolean
  workspaceRespectVSCodeExcludes: boolean
  workspaceSkipBinaries: boolean
  workspaceExclude: string[]
  docFileExtensions: string[]
}

export function getConfig(scope?: vscode.ConfigurationScope): DumbFormatterConfig {
  const c = vscode.workspace.getConfiguration(SECTION, scope)
  return {
    categories: {
      dashes: c.get<boolean>('categories.dashes', true),
      quotes: c.get<boolean>('categories.quotes', true),
      whitespace: c.get<boolean>('categories.whitespace', true),
      ellipsis: c.get<boolean>('categories.ellipsis', true),
      bullets: c.get<boolean>('categories.bullets', true),
      softHyphens: c.get<boolean>('categories.softHyphens', true),
      zeroWidth: c.get<boolean>('categories.zeroWidth', true),
      invisibles: c.get<boolean>('categories.invisibles', true),
      ligatures: c.get<boolean>('categories.ligatures', true),
    },
    emDashReplacement: (c.get<string>('categories.dashesEmReplacement', '-') as '-' | '--'),
    onSaveEnabled: c.get<boolean>('onSave.enabled', false),
    onPasteEnabled: c.get<boolean>('onPaste.enabled', false),
    diagnosticsEnabled: c.get<boolean>('diagnostics.enabled', false),
    diagnosticsSeverity: c.get<DiagnosticSeverity>('diagnostics.severity', 'information'),
    maxFileSizeMB: c.get<number>('maxFileSizeMB', 10),
    workspaceRespectGitignore: c.get<boolean>('workspace.respectGitignore', true),
    workspaceRespectVSCodeExcludes: c.get<boolean>('workspace.respectVSCodeExcludes', true),
    workspaceSkipBinaries: c.get<boolean>('workspace.skipBinaries', true),
    workspaceExclude: c.get<string[]>('workspace.exclude', []),
    docFileExtensions: c.get<string[]>('docFileExtensions', ['md', 'markdown', 'mdx', 'rst', 'txt', 'adoc', 'asciidoc', 'org', 'typ']),
  }
}

export function isDocFile(uri: vscode.Uri | { fsPath: string }, cfg: DumbFormatterConfig): boolean {
  const path = (uri as { fsPath: string }).fsPath
  const dot = path.lastIndexOf('.')
  if (dot < 0) return false
  const ext = path.slice(dot + 1).toLowerCase()
  return cfg.docFileExtensions.includes(ext)
}

export function onConfigChange(handler: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(SECTION)) handler(e)
  })
}

export async function setSetting<T>(key: string, value: T, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
  await vscode.workspace.getConfiguration(SECTION).update(key, value, target)
}

export function toDiagnosticSeverity(s: DiagnosticSeverity): vscode.DiagnosticSeverity {
  switch (s) {
    case 'error': return vscode.DiagnosticSeverity.Error
    case 'warning': return vscode.DiagnosticSeverity.Warning
    case 'hint': return vscode.DiagnosticSeverity.Hint
    case 'information':
    default: return vscode.DiagnosticSeverity.Information
  }
}
