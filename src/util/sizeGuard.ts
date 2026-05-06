import * as vscode from 'vscode'

const ONCE_PER_RUN = new Set<string>()

export function checkFileSize(text: string, maxMB: number, label: string, runId?: string): boolean {
  const bytes = Buffer.byteLength(text, 'utf8')
  const limit = Math.max(0, maxMB) * 1024 * 1024
  if (limit > 0 && bytes > limit) {
    const key = runId ? `${runId}:${label}` : label
    if (!ONCE_PER_RUN.has(key)) {
      ONCE_PER_RUN.add(key)
      const sizeMB = (bytes / (1024 * 1024)).toFixed(1)
      void vscode.window.showWarningMessage(`Dumb Formatter: ${label} is ${sizeMB} MB (over the ${maxMB} MB limit). Continuing anyway.`)
    }
  }
  return true
}

export function clearSizeWarningCache(): void {
  ONCE_PER_RUN.clear()
}

export function exceedsBytes(text: string, maxBytes: number): boolean {
  return Buffer.byteLength(text, 'utf8') > maxBytes
}
