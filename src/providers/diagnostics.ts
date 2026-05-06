import * as vscode from 'vscode'
import { transform } from '../transform/transform'
import { getConfig, isDocFile, toDiagnosticSeverity } from '../util/config'

const DEBOUNCE_MS = 250
export const DIAGNOSTIC_SOURCE = 'Dumb Formatter'
export const DIAGNOSTIC_CODE = 'smart-character'

export class DumbFormatterDiagnostics implements vscode.Disposable {
  private collection: vscode.DiagnosticCollection
  private timers = new Map<string, ReturnType<typeof setTimeout>>()
  private subscriptions: vscode.Disposable[] = []

  constructor() {
    this.collection = vscode.languages.createDiagnosticCollection('dumb-formatter')

    this.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((e) => this.schedule(e.document)),
      vscode.workspace.onDidOpenTextDocument((doc) => this.schedule(doc)),
      vscode.workspace.onDidCloseTextDocument((doc) => this.collection.delete(doc.uri)),
    )

    for (const doc of vscode.workspace.textDocuments) this.schedule(doc)
  }

  private schedule(document: vscode.TextDocument): void {
    const key = document.uri.toString()
    const existing = this.timers.get(key)
    if (existing) clearTimeout(existing)
    const handle = setTimeout(() => {
      this.timers.delete(key)
      this.refresh(document)
    }, DEBOUNCE_MS)
    this.timers.set(key, handle)
  }

  refresh(document: vscode.TextDocument): void {
    if (document.uri.scheme === 'output' || document.uri.scheme === 'vscode-scm') return
    const cfg = getConfig(document.uri)
    if (!isDocFile(document.uri, cfg)) {
      this.collection.delete(document.uri)
      return
    }
    const text = document.getText()
    const limitBytes = Math.max(0, cfg.maxFileSizeMB) * 1024 * 1024
    if (limitBytes > 0 && Buffer.byteLength(text, 'utf8') > limitBytes) {
      this.collection.delete(document.uri)
      return
    }
    const result = transform(text, { enabled: cfg.categories, emDashReplacement: cfg.emDashReplacement })
    if (!result.hasMatches) {
      this.collection.delete(document.uri)
      return
    }
    const severity = toDiagnosticSeverity(cfg.diagnosticsSeverity)
    const diagnostics: vscode.Diagnostic[] = []
    for (const edit of result.edits) {
      const range = new vscode.Range(document.positionAt(edit.start), document.positionAt(edit.end))
      const ch = document.getText(range)
      const codepoint = ch.codePointAt(0)?.toString(16).toUpperCase() ?? '?'
      const d = new vscode.Diagnostic(range, `Smart character U+${codepoint.padStart(4, '0')} -> ${describe(edit.replacement)}`, severity)
      d.source = DIAGNOSTIC_SOURCE
      d.code = DIAGNOSTIC_CODE
      diagnostics.push(d)
    }
    this.collection.set(document.uri, diagnostics)
  }

  dispose(): void {
    for (const t of this.timers.values()) clearTimeout(t)
    this.timers.clear()
    for (const d of this.subscriptions) d.dispose()
    this.subscriptions = []
    this.collection.dispose()
  }
}

function describe(replacement: string): string {
  if (replacement === '') return '(remove)'
  return JSON.stringify(replacement)
}
