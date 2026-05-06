import * as assert from 'node:assert/strict'
import * as vscode from 'vscode'

const EXT_ID = 'sammcj.dumb-formatter'
const SECTION = 'dumb-formatter'

async function resetSettings(): Promise<void> {
  const cfg = vscode.workspace.getConfiguration(SECTION)
  for (const key of [
    'onSave.enabled', 'onPaste.enabled', 'diagnostics.enabled',
    'categories.dashesEmReplacement',
  ]) {
    await cfg.update(key, undefined, vscode.ConfigurationTarget.Workspace)
  }
}

function fixtureUri(relative: string): vscode.Uri {
  const folder = vscode.workspace.workspaceFolders![0]!
  return vscode.Uri.joinPath(folder.uri, relative)
}

async function readFixture(relative: string): Promise<string> {
  const bytes = await vscode.workspace.fs.readFile(fixtureUri(relative))
  return new TextDecoder('utf-8').decode(bytes)
}

async function writeFixture(relative: string, content: string): Promise<void> {
  await vscode.workspace.fs.writeFile(fixtureUri(relative), new TextEncoder().encode(content))
}

suite('Dumb Formatter integration', () => {
  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension(EXT_ID)
    assert.ok(ext, `extension ${EXT_ID} not found`)
    await ext!.activate()
  })

  setup(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors')
    await resetSettings()
    await writeFixture('sample.md', '# Sample\nIt’s “not” that simple—really…\n')
  })

  test('replaceInFile cleans a markdown file', async () => {
    const uri = fixtureUri('sample.md')
    const doc = await vscode.workspace.openTextDocument(uri)
    await vscode.window.showTextDocument(doc)
    await vscode.commands.executeCommand('dumb-formatter.replaceInFile', uri)

    const text = doc.getText()
    assert.ok(!/[—‘’“”…]/.test(text), `still contains smart chars: ${text}`)
    assert.ok(text.includes("It's \"not\" that simple-really..."))
  })

  test('replaceInSelection only edits selected range', async () => {
    const uri = fixtureUri('sample.md')
    const doc = await vscode.workspace.openTextDocument(uri)
    const editor = await vscode.window.showTextDocument(doc)
    const fullText = doc.getText()
    const start = doc.positionAt(fullText.indexOf('It'))
    const end = doc.positionAt(fullText.indexOf('really') + 'really'.length)
    editor.selection = new vscode.Selection(start, end)
    await vscode.commands.executeCommand('dumb-formatter.replaceInSelection')

    const text = doc.getText()
    assert.ok(text.includes("It's \"not\" that simple-really"), text)
    assert.ok(text.includes('…'), 'ellipsis after selection should be untouched')
  })

  test('save hook cleans markdown on save when enabled', async () => {
    const cfg = vscode.workspace.getConfiguration(SECTION)
    await cfg.update('onSave.enabled', true, vscode.ConfigurationTarget.Workspace)
    try {
      const uri = fixtureUri('sample.md')
      const doc = await vscode.workspace.openTextDocument(uri)
      const editor = await vscode.window.showTextDocument(doc)
      await editor.edit((eb) => eb.insert(new vscode.Position(0, 0), 'extra — line\n'))
      await doc.save()
      const reread = await readFixture('sample.md')
      assert.ok(!reread.includes('—'), `expected no em-dash after save, got: ${reread}`)
    } finally {
      await cfg.update('onSave.enabled', undefined, vscode.ConfigurationTarget.Workspace)
    }
  })

  test('save hook ignores non-doc files even when enabled', async () => {
    const cfg = vscode.workspace.getConfiguration(SECTION)
    await cfg.update('onSave.enabled', true, vscode.ConfigurationTarget.Workspace)
    try {
      await writeFixture('script.ts', 'const x = 1 // line — keep\n')
      const uri = fixtureUri('script.ts')
      const doc = await vscode.workspace.openTextDocument(uri)
      const editor = await vscode.window.showTextDocument(doc)
      await editor.edit((eb) => eb.insert(new vscode.Position(0, 0), '// new — line\n'))
      await doc.save()
      const reread = await readFixture('script.ts')
      assert.ok(reread.includes('—'), `non-doc file should keep em-dash, got: ${reread}`)
    } finally {
      await cfg.update('onSave.enabled', undefined, vscode.ConfigurationTarget.Workspace)
      try { await vscode.workspace.fs.delete(fixtureUri('script.ts')) } catch {}
    }
  })

  test('replaceInFile works on any file when invoked manually', async () => {
    await writeFixture('script.ts', 'const x = 1 // line — keep\n')
    const uri = fixtureUri('script.ts')
    const doc = await vscode.workspace.openTextDocument(uri)
    await vscode.window.showTextDocument(doc)
    await vscode.commands.executeCommand('dumb-formatter.replaceInFile', uri)
    const text = doc.getText()
    assert.ok(!text.includes('—'), `manual command should clean any file, got: ${text}`)
    try { await vscode.workspace.fs.delete(uri) } catch {}
  })
})
