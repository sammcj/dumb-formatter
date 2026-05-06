import * as assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import { applyEditsToString, transform } from '../../src/transform/transform'
import type { TransformOptions } from '../../src/transform/categories'

const ALL_ON: TransformOptions = {
  enabled: {
    dashes: true, quotes: true, whitespace: true, ellipsis: true,
    bullets: true, softHyphens: true, zeroWidth: true, invisibles: true, ligatures: true,
  },
  emDashReplacement: '-',
}

type RunOpts = {
  enabled?: Partial<TransformOptions['enabled']>
  emDashReplacement?: '-' | '--'
}

function run(text: string, opts: RunOpts = {}): string {
  const merged: TransformOptions = {
    enabled: { ...ALL_ON.enabled, ...(opts.enabled ?? {}) },
    emDashReplacement: opts.emDashReplacement ?? ALL_ON.emDashReplacement,
  }
  const result = transform(text, merged)
  return applyEditsToString(text, result.edits)
}

describe('transform', () => {
  describe('round-trip', () => {
    it('leaves plain ASCII unchanged', () => {
      const ascii = 'The quick brown fox - jumps over... \'lazy\' "dog".'
      assert.equal(run(ascii), ascii)
      assert.equal(transform(ascii, ALL_ON).hasMatches, false)
    })
  })

  describe('dashes', () => {
    it('replaces em-dash with hyphen by default', () => {
      assert.equal(run('a—b'), 'a-b')
    })
    it('replaces em-dash with double hyphen when configured', () => {
      assert.equal(run('a—b', { emDashReplacement: '--' }), 'a--b')
    })
    it('replaces en-dash, horizontal bar, minus sign', () => {
      assert.equal(run('a–b―c−d'), 'a-b-c-d')
    })
  })

  describe('quotes', () => {
    it('replaces curly singles', () => {
      assert.equal(run('he said ‘hi’'), "he said 'hi'")
    })
    it('replaces curly doubles', () => {
      assert.equal(run('she said “hi”'), 'she said "hi"')
    })
    it('replaces low-9 quotes', () => {
      assert.equal(run('„hi“'), '"hi"')
    })
  })

  describe('whitespace', () => {
    it('replaces NBSP with space', () => {
      assert.equal(run('a b'), 'a b')
    })
    it('replaces narrow NBSP', () => {
      assert.equal(run('a b'), 'a b')
    })
    it('replaces ideographic space', () => {
      assert.equal(run('a　b'), 'a b')
    })
  })

  describe('ellipsis', () => {
    it('replaces U+2026 with three dots', () => {
      assert.equal(run('hi…'), 'hi...')
    })
  })

  describe('bullets', () => {
    it('replaces common bullet glyphs with hyphen', () => {
      assert.equal(run('• a\n◦ b\n▪ c'), '- a\n- b\n- c')
    })
    it('replaces stars and middle-dot with asterisk', () => {
      assert.equal(run('foo · bar ✶ baz ⏺ qux'), 'foo * bar * baz * qux')
    })
  })

  describe('quotes - prompt ornaments', () => {
    it('replaces heavy angle ornaments and pointing triangles', () => {
      assert.equal(run('❯ run ⏵ next ❮ back ⏴ prev'), '> run > next < back < prev')
    })
  })

  describe('soft hyphens and zero width', () => {
    it('removes soft hyphen', () => {
      assert.equal(run('a­b'), 'ab')
    })
    it('removes zero-width space', () => {
      assert.equal(run('a​b'), 'ab')
    })
  })

  describe('invisibles', () => {
    it('strips BOM, ZWJ, ZWNJ, word joiner, bidi marks', () => {
      const text = '﻿a‌b‍c⁠d‎e‪f⁦g⁩h'
      assert.equal(run(text), 'abcdefgh')
    })
  })

  describe('ligatures', () => {
    it('expands ligatures by default', () => {
      assert.equal(run('oﬃce'), 'office')
    })
    it('preserves ligatures when category disabled', () => {
      assert.equal(run('oﬃce', { enabled: { ligatures: false } }), 'oﬃce')
    })
  })

  describe('allowedRanges', () => {
    it('applies edits only inside allowed ranges', () => {
      const text = 'plain — keep\nrange — replace\nplain — keep'
      const allowed = [{ start: text.indexOf('range'), end: text.indexOf('replace') + 'replace'.length }]
      const result = transform(text, ALL_ON, allowed)
      const out = applyEditsToString(text, result.edits)
      assert.equal(out, 'plain — keep\nrange - replace\nplain — keep')
    })
    it('produces zero edits when allowedRanges is empty', () => {
      const text = 'a — b'
      const result = transform(text, ALL_ON, [])
      assert.equal(result.edits.length, 0)
    })
  })

  describe('combined', () => {
    it('handles a Word-paste sample correctly', () => {
      const input = 'It’s “not” that simple—really… Try this: • one • two'
      const expected = 'It\'s "not" that simple-really... Try this: - one - two'
      assert.equal(run(input), expected)
    })
  })
})
