import * as vscode from 'vscode'
import { transform } from '../transform/transform'
import { getConfig } from '../util/config'
import { getLogger } from '../util/log'
import { checkFileSize } from '../util/sizeGuard'

export async function replaceInFile(uri?: vscode.Uri): Promise<void> {
  const target = await resolveTarget(uri)
  if (!target) return

  const { editor, document } = target
  const cfg = getConfig(document.uri)
  const text = document.getText()

  checkFileSize(text, cfg.maxFileSizeMB, document.uri.fsPath)

  const result = transform(text, { enabled: cfg.categories, emDashReplacement: cfg.emDashReplacement })

  if (!result.hasMatches) {
    void vscode.window.showInformationMessage(`Dumb Formatter: no smart characters in ${vscode.workspace.asRelativePath(document.uri)}.`)
    return
  }

  if (editor) {
    await editor.edit((eb) => {
      for (const edit of [...result.edits].sort((a, b) => b.start - a.start)) {
        eb.replace(toRange(document, edit.start, edit.end), edit.replacement)
      }
    })
  } else {
    const we = new vscode.WorkspaceEdit()
    for (const edit of result.edits) {
      we.replace(document.uri, toRange(document, edit.start, edit.end), edit.replacement)
    }
    const ok = await vscode.workspace.applyEdit(we)
    if (!ok) {
      void vscode.window.showWarningMessage(`Dumb Formatter: edit rejected for ${vscode.workspace.asRelativePath(document.uri)}.`)
      return
    }
    if (document.isDirty) await document.save()
  }

  getLogger().info(`Replaced ${result.edits.length} character(s) in ${document.uri.fsPath}`)
}

function toRange(document: vscode.TextDocument, start: number, end: number): vscode.Range {
  return new vscode.Range(document.positionAt(start), document.positionAt(end))
}

interface Target {
  editor: vscode.TextEditor | undefined
  document: vscode.TextDocument
}

async function resolveTarget(uri?: vscode.Uri): Promise<Target | undefined> {
  if (uri) {
    const document = await vscode.workspace.openTextDocument(uri)
    const editor = vscode.window.visibleTextEditors.find((e) => e.document.uri.toString() === uri.toString())
    return { editor, document }
  }
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    void vscode.window.showInformationMessage('Dumb Formatter: no active editor.')
    return undefined
  }
  return { editor, document: editor.document }
}
