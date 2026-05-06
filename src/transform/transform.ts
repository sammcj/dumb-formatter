import { buildRegex, buildReplacementMap, type TransformOptions } from './categories'

export interface TransformEdit {
  start: number
  end: number
  replacement: string
}

export interface Range {
  start: number
  end: number
}

export interface TransformResult {
  edits: TransformEdit[]
  hasMatches: boolean
}

export function transform(text: string, options: TransformOptions, allowedRanges?: Range[]): TransformResult {
  const map = buildReplacementMap(options)
  const regex = buildRegex(map)
  if (!regex) return { edits: [], hasMatches: false }

  const ranges = allowedRanges === undefined ? null : sortRanges(allowedRanges)

  const edits: TransformEdit[] = []
  for (const match of text.matchAll(regex)) {
    const start = match.index
    if (start === undefined) continue
    if (ranges && !inAnyRange(start, ranges)) continue
    const ch = match[0]
    const replacement = map.get(ch)
    if (replacement === undefined) continue
    edits.push({ start, end: start + ch.length, replacement })
  }
  return { edits, hasMatches: edits.length > 0 }
}

export function hasAnyTargetedChar(text: string, options: TransformOptions): boolean {
  const map = buildReplacementMap(options)
  const regex = buildRegex(map)
  return regex ? regex.test(text) : false
}

export function applyEditsToString(text: string, edits: TransformEdit[]): string {
  if (edits.length === 0) return text
  const sorted = [...edits].sort((a, b) => a.start - b.start)
  let out = ''
  let cursor = 0
  for (const edit of sorted) {
    out += text.slice(cursor, edit.start) + edit.replacement
    cursor = edit.end
  }
  out += text.slice(cursor)
  return out
}

function sortRanges(ranges: Range[]): Range[] {
  return [...ranges].sort((a, b) => a.start - b.start)
}

function inAnyRange(offset: number, sortedRanges: Range[]): boolean {
  let lo = 0
  let hi = sortedRanges.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const r = sortedRanges[mid]
    if (offset < r.start) hi = mid - 1
    else if (offset >= r.end) lo = mid + 1
    else return true
  }
  return false
}
