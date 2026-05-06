import * as vscode from 'vscode'
import { transform } from '../transform/transform'
import { getConfig, isDocFile } from '../util/config'

const SAVE_HOOK_MAX_BYTES = 1 * 1024 * 1024

export function registerSaveHook(): vscode.Disposable {
  return vscode.workspace.onWillSaveTextDocument((event) => {
    const cfg = getConfig(event.document.uri)
    if (!cfg.onSaveEnabled) return
    if (!isDocFile(event.document.uri, cfg)) return

    const text = event.document.getText()
    if (Buffer.byteLength(text, 'utf8') > SAVE_HOOK_MAX_BYTES) return

    const result = transform(text, { enabled: cfg.categories, emDashReplacement: cfg.emDashReplacement })
    if (!result.hasMatches) return

    const sorted = [...result.edits].sort((a, b) => a.start - b.start)
    const textEdits = sorted.map((edit) => vscode.TextEdit.replace(
      new vscode.Range(event.document.positionAt(edit.start), event.document.positionAt(edit.end)),
      edit.replacement,
    ))
    event.waitUntil(Promise.resolve(textEdits))
  })
}
