import * as vscode from 'vscode'
import { replaceInFile } from './commands/currentFile'
import { replaceInDocFiles, replaceInWorkspace } from './commands/workspace'
import { replaceInSelection } from './commands/selection'
import { registerSaveHook } from './hooks/onSave'
import { runFirstRunPromptIfNeeded } from './onboarding/firstRun'
import { DumbFormatterCodeActions } from './providers/codeActions'
import { DumbFormatterDiagnostics } from './providers/diagnostics'
import { registerPasteProvider } from './providers/pasteEdit'
import { getConfig, onConfigChange, setSetting } from './util/config'
import { disposeLogger, getLogger } from './util/log'

interface ToggleableState {
  diagnostics?: DumbFormatterDiagnostics
  codeActionDisposable?: vscode.Disposable
  pasteDisposable?: vscode.Disposable
  saveDisposable?: vscode.Disposable
}

export function activate(context: vscode.ExtensionContext): void {
  const log = getLogger()
  log.info('Dumb Formatter activated')

  const state: ToggleableState = {}

  context.subscriptions.push(
    vscode.commands.registerCommand('dumb-formatter.replaceInFile', (uri?: vscode.Uri) => replaceInFile(uri)),
    vscode.commands.registerCommand('dumb-formatter.replaceInSelection', () => replaceInSelection()),
    vscode.commands.registerCommand('dumb-formatter.replaceInWorkspace', () => replaceInWorkspace()),
    vscode.commands.registerCommand('dumb-formatter.replaceInDocFiles', () => replaceInDocFiles()),
    vscode.commands.registerCommand('dumb-formatter.toggleDiagnostics', async () => {
      const cfg = getConfig()
      await setSetting('diagnostics.enabled', !cfg.diagnosticsEnabled)
    }),
    vscode.commands.registerCommand('dumb-formatter.enableOnSave', () => enableFeature('onSave.enabled', 'Replace on save enabled')),
    vscode.commands.registerCommand('dumb-formatter.enableOnPaste', () => enableFeature('onPaste.enabled', 'Replace on paste enabled')),
    vscode.commands.registerCommand('dumb-formatter.enableDiagnostics', () => enableFeature('diagnostics.enabled', 'Inline diagnostics enabled')),
  )

  syncFeatureProviders(state, context)

  context.subscriptions.push(
    onConfigChange(() => syncFeatureProviders(state, context)),
  )

  context.subscriptions.push({
    dispose: () => {
      state.diagnostics?.dispose()
      state.codeActionDisposable?.dispose()
      state.pasteDisposable?.dispose()
      state.saveDisposable?.dispose()
      disposeLogger()
    },
  })

  void runFirstRunPromptIfNeeded(context)
}

function syncFeatureProviders(state: ToggleableState, context: vscode.ExtensionContext): void {
  const cfg = getConfig()
  const log = getLogger()

  if (cfg.diagnosticsEnabled && !state.diagnostics) {
    state.diagnostics = new DumbFormatterDiagnostics()
    state.codeActionDisposable = vscode.languages.registerCodeActionsProvider(
      { scheme: 'file' },
      new DumbFormatterCodeActions(),
      DumbFormatterCodeActions.metadata,
    )
    context.subscriptions.push(state.codeActionDisposable, state.diagnostics)
    log.info('Diagnostics enabled')
  } else if (!cfg.diagnosticsEnabled && state.diagnostics) {
    state.diagnostics.dispose()
    state.diagnostics = undefined
    state.codeActionDisposable?.dispose()
    state.codeActionDisposable = undefined
    log.info('Diagnostics disabled')
  } else if (cfg.diagnosticsEnabled && state.diagnostics) {
    for (const doc of vscode.workspace.textDocuments) state.diagnostics.refresh(doc)
  }

  if (cfg.onPasteEnabled && !state.pasteDisposable) {
    state.pasteDisposable = registerPasteProvider()
    context.subscriptions.push(state.pasteDisposable)
    log.info('Paste hook enabled')
  } else if (!cfg.onPasteEnabled && state.pasteDisposable) {
    state.pasteDisposable.dispose()
    state.pasteDisposable = undefined
    log.info('Paste hook disabled')
  }

  if (cfg.onSaveEnabled && !state.saveDisposable) {
    state.saveDisposable = registerSaveHook()
    context.subscriptions.push(state.saveDisposable)
    log.info('Save hook enabled')
  } else if (!cfg.onSaveEnabled && state.saveDisposable) {
    state.saveDisposable.dispose()
    state.saveDisposable = undefined
    log.info('Save hook disabled')
  }
}

async function enableFeature(key: 'onSave.enabled' | 'onPaste.enabled' | 'diagnostics.enabled', message: string): Promise<void> {
  try {
    await setSetting(key, true)
  } catch (err) {
    const log = getLogger()
    log.error(`Failed to enable ${key}: ${err instanceof Error ? err.message : String(err)}`)
    void vscode.window.showErrorMessage(`Dumb Formatter: could not update setting ${key}.`)
    return
  }
  void vscode.window.showInformationMessage(`Dumb Formatter: ${message}.`)
}

export function deactivate(): void {
  disposeLogger()
}
