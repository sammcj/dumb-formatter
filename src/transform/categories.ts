export type CategoryId =
  | 'dashes'
  | 'quotes'
  | 'whitespace'
  | 'ellipsis'
  | 'bullets'
  | 'softHyphens'
  | 'zeroWidth'
  | 'invisibles'
  | 'ligatures'

export interface CategoryFlags {
  dashes: boolean
  quotes: boolean
  whitespace: boolean
  ellipsis: boolean
  bullets: boolean
  softHyphens: boolean
  zeroWidth: boolean
  invisibles: boolean
  ligatures: boolean
}

export interface TransformOptions {
  enabled: CategoryFlags
  emDashReplacement: '-' | '--'
}

export const ALL_CATEGORIES: readonly CategoryId[] = [
  'dashes',
  'quotes',
  'whitespace',
  'ellipsis',
  'bullets',
  'softHyphens',
  'zeroWidth',
  'invisibles',
  'ligatures',
]

const DASHES: Record<string, string> = {
  '–': '-', // en dash
  '―': '-', // horizontal bar
  '−': '-', // minus sign
}

const QUOTES: Record<string, string> = {
  '‘': "'", // left single quotation
  '’': "'", // right single quotation
  '‚': "'", // single low-9
  '‛': "'", // single high-reversed-9
  '“': '"', // left double quotation
  '”': '"', // right double quotation
  '„': '"', // double low-9
  '‟': '"', // double high-reversed-9
  '‹': "'", // single left angle quotation
  '›': "'", // single right angle quotation
  '«': '"', // left double angle
  '»': '"', // right double angle
  '❯': '>', // heavy right-pointing angle quotation mark ornament
  '❮': '<', // heavy left-pointing angle quotation mark ornament
}

const WHITESPACE: Record<string, string> = {
  ' ': ' ', // no-break space
  ' ': ' ', // ogham space mark
  ' ': ' ', // en quad
  ' ': ' ', // em quad
  ' ': ' ', // en space
  ' ': ' ', // em space
  ' ': ' ', // three-per-em space
  ' ': ' ', // four-per-em space
  ' ': ' ', // six-per-em space
  ' ': ' ', // figure space
  ' ': ' ', // punctuation space
  ' ': ' ', // thin space
  ' ': ' ', // hair space
  ' ': ' ', // narrow no-break space
  ' ': ' ', // medium mathematical space
  '　': ' ', // ideographic space
}

const ELLIPSIS: Record<string, string> = {
  '…': '...',
}

const BULLETS: Record<string, string> = {
  '•': '-', // bullet
  '‣': '-', // triangular bullet
  '◦': '-', // white bullet
  '▪': '-', // black small square
  '▫': '-', // white small square
  '⁃': '-', // hyphen bullet
  '⁌': '-', // black leftwards bullet
  '⁍': '-', // black rightwards bullet
  '·': '*', // middle dot (commonly used as separator)
  '⏺': '*', // black circle for record
  '✶': '*', // six pointed black star
  '⏵': '>', // black medium right-pointing triangle
  '⏴': '<', // black medium left-pointing triangle
}

const SOFT_HYPHENS: Record<string, string> = {
  '­': '',
}

const ZERO_WIDTH: Record<string, string> = {
  '​': '',
}

const INVISIBLES: Record<string, string> = {
  '﻿': '', // BOM
  '‌': '', // ZWNJ
  '‍': '', // ZWJ
  '⁠': '', // word joiner
  '‎': '', // LRM
  '‏': '', // RLM
  '‪': '', // LRE
  '‫': '', // RLE
  '‬': '', // PDF
  '‭': '', // LRO
  '‮': '', // RLO
  '⁦': '', // LRI
  '⁧': '', // RLI
  '⁨': '', // FSI
  '⁩': '', // PDI
}

const LIGATURES: Record<string, string> = {
  'ﬀ': 'ff',
  'ﬁ': 'fi',
  'ﬂ': 'fl',
  'ﬃ': 'ffi',
  'ﬄ': 'ffl',
  'ﬅ': 'st',
  'ﬆ': 'st',
}

export function buildReplacementMap(opts: TransformOptions): Map<string, string> {
  const map = new Map<string, string>()
  const { enabled } = opts

  if (enabled.dashes) {
    map.set('—', opts.emDashReplacement) // em dash, configurable
    for (const [from, to] of Object.entries(DASHES)) map.set(from, to)
  }
  if (enabled.quotes) for (const [from, to] of Object.entries(QUOTES)) map.set(from, to)
  if (enabled.whitespace) for (const [from, to] of Object.entries(WHITESPACE)) map.set(from, to)
  if (enabled.ellipsis) for (const [from, to] of Object.entries(ELLIPSIS)) map.set(from, to)
  if (enabled.bullets) for (const [from, to] of Object.entries(BULLETS)) map.set(from, to)
  if (enabled.softHyphens) for (const [from, to] of Object.entries(SOFT_HYPHENS)) map.set(from, to)
  if (enabled.zeroWidth) for (const [from, to] of Object.entries(ZERO_WIDTH)) map.set(from, to)
  if (enabled.invisibles) for (const [from, to] of Object.entries(INVISIBLES)) map.set(from, to)
  if (enabled.ligatures) for (const [from, to] of Object.entries(LIGATURES)) map.set(from, to)
  return map
}

export function buildRegex(map: Map<string, string>): RegExp | null {
  if (map.size === 0) return null
  const escaped = [...map.keys()].map(escapeForCharClass).join('')
  return new RegExp(`[${escaped}]`, 'gu')
}

function escapeForCharClass(ch: string): string {
  const code = ch.codePointAt(0) ?? 0
  return `\\u{${code.toString(16)}}`
}
