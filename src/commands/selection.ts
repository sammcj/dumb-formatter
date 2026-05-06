import * as vscode from 'vscode'
import { transform } from '../transform/transform'
import { getConfig } from '../util/config'
import { getLogger } from '../util/log'

export async function replaceInSelection(): Promise<void> {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    void vscode.window.showInformationMessage('Dumb Formatter: no active editor.')
    return
  }
  const selections = editor.selections.filter((s) => !s.isEmpty)
  if (selections.length === 0) {
    void vscode.window.showInformationMessage('Dumb Formatter: nothing selected.')
    return
  }

  const cfg = getConfig(editor.document.uri)
  const logger = getLogger()

  let totalEdits = 0
  await editor.edit((eb) => {
    for (const sel of selections) {
      const text = editor.document.getText(sel)
      const result = transform(text, { enabled: cfg.categories, emDashReplacement: cfg.emDashReplacement })
      if (!result.hasMatches) continue
      for (const edit of [...result.edits].sort((a, b) => b.start - a.start)) {
        const start = editor.document.positionAt(editor.document.offsetAt(sel.start) + edit.start)
        const end = editor.document.positionAt(editor.document.offsetAt(sel.start) + edit.end)
        eb.replace(new vscode.Range(start, end), edit.replacement)
        totalEdits++
      }
    }
  })

  if (totalEdits === 0) {
    void vscode.window.showInformationMessage('Dumb Formatter: no smart characters found in selection.')
  } else {
    logger.info(`Replaced ${totalEdits} character(s) in selection`)
  }
}
