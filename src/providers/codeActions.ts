import * as vscode from 'vscode'
import { DIAGNOSTIC_SOURCE } from './diagnostics'

export class DumbFormatterCodeActions implements vscode.CodeActionProvider {
  static readonly metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
  }

  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const ours = context.diagnostics.filter((d) => d.source === DIAGNOSTIC_SOURCE)
    if (ours.length === 0) return []

    const actions: vscode.CodeAction[] = []
    for (const diag of ours) {
      const action = new vscode.CodeAction('Replace smart character', vscode.CodeActionKind.QuickFix)
      action.diagnostics = [diag]
      action.edit = new vscode.WorkspaceEdit()
      const replacement = parseReplacementFromMessage(diag.message)
      if (replacement === undefined) continue
      action.edit.replace(document.uri, diag.range, replacement)
      actions.push(action)
    }

    const fixAll = new vscode.CodeAction('Replace all smart characters in file', vscode.CodeActionKind.QuickFix)
    fixAll.diagnostics = ours
    fixAll.isPreferred = true
    fixAll.edit = new vscode.WorkspaceEdit()
    for (const diag of ours) {
      const replacement = parseReplacementFromMessage(diag.message)
      if (replacement === undefined) continue
      fixAll.edit.replace(document.uri, diag.range, replacement)
    }
    actions.push(fixAll)
    return actions
  }
}

function parseReplacementFromMessage(message: string): string | undefined {
  const idx = message.indexOf('->')
  if (idx < 0) return undefined
  const tail = message.slice(idx + 2).trim()
  if (tail === '(remove)') return ''
  try {
    return JSON.parse(tail)
  } catch {
    return undefined
  }
}
