import * as assert from 'node:assert/strict'
import * as vscode from 'vscode'

const EXT_ID = 'SamMcLeod.dumb-formatter'
const SECTION = 'dumb-formatter'

suite('Walkthrough enable commands', () => {
  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension(EXT_ID)
    assert.ok(ext, `extension ${EXT_ID} not found`)
    await ext!.activate()
  })

  setup(async () => {
    const cfg = vscode.workspace.getConfiguration(SECTION)
    for (const key of ['onSave.enabled', 'onPaste.enabled', 'diagnostics.enabled']) {
      await cfg.update(key, undefined, vscode.ConfigurationTarget.Global)
      await cfg.update(key, undefined, vscode.ConfigurationTarget.Workspace)
    }
  })

  test('enableOnSave sets dumb-formatter.onSave.enabled to true', async () => {
    await vscode.commands.executeCommand('dumb-formatter.enableOnSave')
    const v = vscode.workspace.getConfiguration(SECTION).get<boolean>('onSave.enabled')
    assert.equal(v, true)
  })

  test('enableOnPaste sets dumb-formatter.onPaste.enabled to true', async () => {
    await vscode.commands.executeCommand('dumb-formatter.enableOnPaste')
    const v = vscode.workspace.getConfiguration(SECTION).get<boolean>('onPaste.enabled')
    assert.equal(v, true)
  })

  test('enableDiagnostics sets dumb-formatter.diagnostics.enabled to true', async () => {
    await vscode.commands.executeCommand('dumb-formatter.enableDiagnostics')
    const v = vscode.workspace.getConfiguration(SECTION).get<boolean>('diagnostics.enabled')
    assert.equal(v, true)
  })
})
