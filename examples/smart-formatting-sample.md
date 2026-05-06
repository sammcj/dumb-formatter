# Smart formatting sample

Open this file and run **Dumb Formatter: Replace Smart Formatting in File** to clean every section. Each row shows the smart character, its codepoint, and the expected ASCII replacement.

## Dashes

| Char | Codepoint | Replacement |
|------|-----------|-------------|
| —    | U+2014    | `-` (or `--` if `dashesEmReplacement` is set to `--`) |
| –    | U+2013    | `-` |
| ―    | U+2015    | `-` |
| −    | U+2212    | `-` |

In context: it's not that simple—really. The dates run 2024–2026. Use −5 instead of -5 in the formula.

## Quotes

| Char | Codepoint | Replacement |
|------|-----------|-------------|
| ‘ ’  | U+2018, U+2019 | `'` |
| “ ”  | U+201C, U+201D | `"` |
| ‚ „  | U+201A, U+201E | `'` / `"` |
| ‛ ‟  | U+201B, U+201F | `'` / `"` |
| ‹ ›  | U+2039, U+203A | `'` |
| « »  | U+00AB, U+00BB | `"` |
| ❯ ❮  | U+276F, U+276E | `>` / `<` (heavy angle ornaments, common in shell prompts) |

In context: He said “it’s ‘half-broken’ at best”. ‚untere‘ und „obere“ Anführungszeichen. ‹simple› and «double» guillemets.

## Whitespace

The following line uses a non-breaking space between the two words: hello world.

The following line uses a narrow NBSP: 1 234 km.

These spaces are all different widths and should collapse to regular spaces:

- en-quad:  
- em-quad:  
- en-space:  
- em-space:  
- three-per-em:  
- four-per-em:  
- six-per-em:  
- figure-space:  
- punctuation-space:  
- thin-space:  
- hair-space:  
- narrow NBSP:  
- medium math:  
- ideographic:　

## Ellipsis

The story goes on… and on… and on…

Replacement: three ASCII dots `...`.

## Bullets, separators, and ornaments

Round and square bullets (replaced with `-`):

- • bullet (U+2022)
- ‣ triangular bullet (U+2023)
- ◦ white bullet (U+25E6)
- ▪ black small square (U+25AA)
- ▫ white small square (U+25AB)
- ⁃ hyphen bullet (U+2043)
- ⁌ black leftwards bullet (U+204C)
- ⁍ black rightwards bullet (U+204D)

Stars and middle-dot separators (replaced with `*`):

- · middle dot (U+00B7) — often used as separator: foo · bar · baz
- ⏺ record circle (U+23FA)
- ✶ six-pointed star (U+2736)

Pointing triangles (replaced with `>` / `<`):

- ⏵ right-pointing triangle (U+23F5)
- ⏴ left-pointing triangle (U+23F4)

## Soft hyphen

The word "hyphen­ation" contains a soft hyphen between "hyphen" and "ation". After cleaning the word becomes "hyphenation".

## Zero-width space

The word "zero​width" contains a zero-width space between "zero" and "width". After cleaning the word becomes "zerowidth".

## Invisibles (BOM, ZWJ, ZWNJ, word joiner, bidi marks)

﻿This line begins with a BOM (U+FEFF). After cleaning the BOM is removed.

The string "ab‌c" contains a ZWNJ between b and c. After cleaning: "abc".

The string "ab‍c" contains a ZWJ between b and c. After cleaning: "abc".

The string "ab⁠c" contains a word joiner between b and c. After cleaning: "abc".

‎Left-to-right mark begins this line. After cleaning the mark is removed.

‏Right-to-left mark begins this line. After cleaning the mark is removed.

The line "abc‪def‬ghi" contains a Left-to-Right Embedding (U+202A) and Pop Directional Formatting (U+202C). After cleaning: "abcdefghi".

The line "abc⁦def⁩ghi" contains Left-to-Right Isolate (U+2066) and Pop Directional Isolate (U+2069). After cleaning: "abcdefghi".

## Ligatures

Presentation-form ligatures from the Alphabetic Presentation Forms block, expanded to component letters. Toggle off via `dumb-formatter.categories.ligatures` if you want them preserved.

| Char | Codepoint | Replacement |
|------|-----------|-------------|
| ﬀ    | U+FB00    | `ff` |
| ﬁ    | U+FB01    | `fi` |
| ﬂ    | U+FB02    | `fl` |
| ﬃ    | U+FB03    | `ffi` |
| ﬄ    | U+FB04    | `ffl` |
| ﬅ    | U+FB05    | `st` |
| ﬆ    | U+FB06    | `st` |

In context: the oﬃce is on the ﬁfth ﬂoor.

## Word-paste blob

A typical paste from Microsoft Word, Google Docs, or LLM output:

> It's a "complete" rewrite—everything's new, nothing's old. We've shipped: • a parser • a renderer • a cache. The deadline is set: 30 March 2026—maybe 31 March 2026. Some text contains hidden bidi marks‎ that you can't see‏.

After cleaning, this should be plain ASCII with no smart characters left.

## Verification

After running the command, search this file for any of these characters and you should find none of them:

```
—–―−'""„‚‛‟‹›«»❮❯…•‣◦▪▫⁃⁌⁍·⏺✶⏴⏵­​﻿‌‍⁠‎‏‪‫‬‭‮⁦⁧⁨⁩ﬀﬁﬂﬃﬄﬅﬆ
```

You can also paste any of the above into the editor with `dumb-formatter.onPaste.enabled` turned on and watch them get cleaned as they land.
