import * as vscode from 'vscode'
import { applyEditsToString, transform } from '../transform/transform'
import { getConfig } from '../util/config'

const PASTE_KIND = vscode.DocumentDropOrPasteEditKind.Empty.append('text', 'dumb')

class DumbFormatterPasteProvider implements vscode.DocumentPasteEditProvider {
  async provideDocumentPasteEdits(
    document: vscode.TextDocument,
    _ranges: readonly vscode.Range[],
    dataTransfer: vscode.DataTransfer,
    _context: vscode.DocumentPasteEditContext,
    token: vscode.CancellationToken,
  ): Promise<vscode.DocumentPasteEdit[] | undefined> {
    const cfg = getConfig(document.uri)
    if (!cfg.onPasteEnabled) return undefined

    const item = dataTransfer.get('text/plain')
    if (!item) return undefined
    const original = await item.asString()
    if (token.isCancellationRequested) return undefined

    const result = transform(original, { enabled: cfg.categories, emDashReplacement: cfg.emDashReplacement })
    if (!result.hasMatches) return undefined

    const cleaned = applyEditsToString(original, result.edits)
    const edit = new vscode.DocumentPasteEdit(cleaned, 'Paste without smart formatting', PASTE_KIND)
    return [edit]
  }
}

export function registerPasteProvider(): vscode.Disposable {
  return vscode.languages.registerDocumentPasteEditProvider(
    { scheme: 'file' },
    new DumbFormatterPasteProvider(),
    {
      providedPasteEditKinds: [PASTE_KIND],
      pasteMimeTypes: ['text/plain'],
    },
  )
}
