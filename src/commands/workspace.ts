import * as vscode from 'vscode'
import { transform, type TransformEdit } from '../transform/transform'
import { getConfig, type DumbFormatterConfig } from '../util/config'
import { getLogger } from '../util/log'
import { checkFileSize } from '../util/sizeGuard'
import { listWorkspaceFiles } from '../workspace/fileWalk'

const APPLY_BATCH = 250
const READ_CONCURRENCY = 8

export async function replaceInWorkspace(): Promise<void> {
  await runWorkspaceCommand('Replace smart formatting (workspace)', undefined)
}

export async function replaceInDocFiles(): Promise<void> {
  const cfg = getConfig()
  const include = `**/*.{${cfg.docFileExtensions.join(',')}}`
  await runWorkspaceCommand('Replace smart formatting (doc files)', include)
}

async function runWorkspaceCommand(title: string, include: string | undefined): Promise<void> {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    void vscode.window.showInformationMessage('Dumb Formatter: open a workspace folder first.')
    return
  }
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Dumb Formatter: ${title}`,
      cancellable: true,
    },
    async (progress, token) => {
      const cfg = getConfig()
      progress.report({ message: 'Discovering files...' })
      const uris = await listWorkspaceFiles({ include, cfg, token })
      if (token.isCancellationRequested) return
      if (uris.length === 0) {
        void vscode.window.showInformationMessage('Dumb Formatter: no files matched.')
        return
      }

      progress.report({ message: `Scanning ${uris.length} file(s)...` })
      const fileEdits = await scanFiles(uris, cfg, progress, token)
      if (token.isCancellationRequested) return

      const totalFiles = fileEdits.length
      if (totalFiles === 0) {
        void vscode.window.showInformationMessage('Dumb Formatter: no smart characters found.')
        return
      }

      progress.report({ message: `Applying edits to ${totalFiles} file(s)...` })
      const { applied, rejected } = await applyEditsBatched(fileEdits, token)
      const totalChars = fileEdits.reduce((sum, e) => sum + e.edits.length, 0)
      getLogger().info(`Workspace run: ${applied}/${totalFiles} files updated (${totalChars} chars). Rejected: ${rejected.length}.`)
      if (rejected.length > 0) {
        void vscode.window.showWarningMessage(`Dumb Formatter: ${rejected.length} file(s) could not be updated. See "Dumb Formatter" output channel.`)
        for (const uri of rejected) getLogger().warn(`Rejected: ${uri.fsPath}`)
      } else {
        void vscode.window.showInformationMessage(`Dumb Formatter: cleaned ${totalChars} character(s) across ${applied} file(s).`)
      }
    },
  )
}

interface FileEdits {
  uri: vscode.Uri
  edits: TransformEdit[]
}

async function scanFiles(
  uris: vscode.Uri[],
  cfg: DumbFormatterConfig,
  progress: vscode.Progress<{ message?: string, increment?: number }>,
  token: vscode.CancellationToken,
): Promise<FileEdits[]> {
  const results: FileEdits[] = []
  const step = 100 / uris.length

  await runWithSemaphore(uris, READ_CONCURRENCY, async (uri) => {
    if (token.isCancellationRequested) return
    try {
      const bytes = await vscode.workspace.fs.readFile(uri)
      const text = new TextDecoder('utf-8').decode(bytes)
      checkFileSize(text, cfg.maxFileSizeMB, uri.fsPath, 'workspace')
      const result = transform(text, { enabled: cfg.categories, emDashReplacement: cfg.emDashReplacement })
      if (result.hasMatches) results.push({ uri, edits: result.edits })
    } catch (err) {
      getLogger().warn(`Failed to scan ${uri.fsPath}: ${String(err)}`)
    } finally {
      progress.report({ increment: step })
    }
  })

  return results
}

async function applyEditsBatched(fileEdits: FileEdits[], token: vscode.CancellationToken): Promise<{ applied: number, rejected: vscode.Uri[] }> {
  let applied = 0
  const rejected: vscode.Uri[] = []
  for (let i = 0; i < fileEdits.length; i += APPLY_BATCH) {
    if (token.isCancellationRequested) break
    const batch = fileEdits.slice(i, i + APPLY_BATCH)
    const docs = await Promise.all(batch.map(({ uri }) => Promise.resolve(vscode.workspace.openTextDocument(uri))))
    if (token.isCancellationRequested) break
    const we = new vscode.WorkspaceEdit()
    for (let j = 0; j < batch.length; j++) {
      const { uri, edits } = batch[j]
      const document = docs[j]
      for (const edit of edits) {
        we.replace(uri, new vscode.Range(document.positionAt(edit.start), document.positionAt(edit.end)), edit.replacement)
      }
    }
    const ok = await vscode.workspace.applyEdit(we)
    if (ok) {
      applied += batch.length
      await Promise.all(docs.map(async (doc) => {
        try {
          if (doc.isDirty) await doc.save()
        } catch (err) {
          getLogger().warn(`Save failed for ${doc.uri.fsPath}: ${String(err)}`)
        }
      }))
    } else {
      for (const { uri } of batch) rejected.push(uri)
    }
  }
  return { applied, rejected }
}

async function runWithSemaphore<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  const queue = items.slice()
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (item === undefined) return
      await fn(item)
    }
  })
  await Promise.all(workers)
}
