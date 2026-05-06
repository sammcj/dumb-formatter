# dumb-formatter - Development Plan

## Context

A fast, lightweight VS Code extension that strips "smart" / hidden Unicode formatting (em/en dashes, smart quotes, NBSPs, zero-width chars, soft hyphens, BOM, bidi marks, etc.) and replaces it with plain ASCII. Pasting text from Word, web pages, or LLM output into source files and prose routinely introduces these characters; they break diffs, regex, terminal output, and code reviews. There's no good "make this dumb" button in VS Code today - this extension provides one via commands, an opt-in save hook, and a paste-time transform.

Targets:

- low idle CPU and memory
- latest VS Code API surface (validated against Microsoft samples and docs, May 2026)
- latest stable dependencies
- esbuild-bundled, sub-100 KB minified
- `<` 1 s save-hook work; ≤10 MB single-file budget by default

## Requirements

### In-scope characters (per-category, all individually toggleable)

| Category | Examples | Replacement |
|---|---|---|
| `dashes` | em-dash `—` (U+2014), en-dash `–` (U+2013), horizontal bar `―` (U+2015), minus `−` (U+2212) | `-` (em configurable to `--`) |
| `quotes` | `'` `'` `"` `"` `‚` `„` `‹` `›` `«` `»` | `'` or `"` |
| `whitespace` | NBSP (U+00A0), narrow NBSP (U+202F), figure space (U+2007), em/en/thin/hair/punctuation/ideographic spaces (U+2002-200A, U+3000) | regular space |
| `ellipsis` | `…` (U+2026) | `...` |
| `bullets` | `•` `◦` `▪` `▫` `‣` `⁃` | `-` |
| `softHyphens` | U+00AD | removed |
| `zeroWidth` | ZWSP (U+200B) | removed |
| `invisibles` | BOM (U+FEFF), word joiner (U+2060), ZWJ (U+200D), ZWNJ (U+200C), bidi marks (U+200E/F, U+202A-E, U+2066-9) | removed |
| `ligatures` (off by default) | `ﬁ` `ﬂ` `ﬃ` `ﬄ` | expanded |

### Functional requirements

- Replace smart formatting in current file
- Replace smart formatting in selected text
- Replace smart formatting across entire workspace
- Replace smart formatting in documentation files (`.md .markdown .mdx .rst .txt .adoc .asciidoc .org .typ`, configurable)
- Optional replace-on-save (default off)
- Optional replace-on-paste (default off)
- Optional inline diagnostics with quick fixes (default off)
- File-size guard: 10 MB default, configurable, warn-and-continue when exceeded; save-hook short-circuits above 1 MB
- Configurable keybindings for all commands (none assigned by default)
- First-run walkthrough that lets the user pick which auto features to enable

### Source-code handling

Setting `sourceCode.scope` with values `off` (default) | `comments-only` | `all`. Comments-only mode uses an internal `languageId -> { line, block }` marker map covering ~25 common languages; user can extend via `commentMarkers` setting. Range extraction is a small state machine, no AST.

### Workspace traversal

`vscode.workspace.findFiles(include, exclude)` for discovery. **Important constraints from VS Code docs:**

- `findFiles` honours `files.exclude` only when `exclude` is `undefined`; `search.exclude` is ignored entirely
- `findFiles` does **not** honour `.gitignore`

Implementation: build an explicit merged exclude glob from `files.exclude` + `search.exclude` + user globs and pass it. When `workspace.respectGitignore` is true, post-filter results with the [`ignore`](https://www.npmjs.com/package/ignore) npm package. Binary detection is two-stage: extension-list pre-filter (`.png .jpg .pdf .zip .exe ...`), then read first 8 KB and skip files containing a null byte (the heuristic git itself uses).

## Architecture

Single-process extension, no language server. All replacement logic is pure (string in -> edits out) so it's trivially testable and reusable across commands, paste, save, and diagnostics.

```
src/
  extension.ts                Activation, command + provider registration
  transform/
    categories.ts             Category definitions + replacement maps
    transform.ts              Pure: (text, options, allowedRanges?) -> Edit[]
    commentRanges.ts          Per-language comment-marker map + range extraction
  commands/
    currentFile.ts
    selection.ts
    workspace.ts
    docFiles.ts
  providers/
    diagnostics.ts            Opt-in DiagnosticCollection; debounced
    codeActions.ts            Quick fixes for diagnostics
    pasteEdit.ts              DocumentPasteEditProvider
  hooks/
    onSave.ts                 onWillSaveTextDocument
  onboarding/
    firstRun.ts               Walkthrough fallback (info-message prompt)
  workspace/
    fileWalk.ts               .gitignore + files.exclude + user globs + binary sniff
  util/
    sizeGuard.ts              10 MB warn-and-continue
    config.ts                 Typed config getter, change watcher
    log.ts                    LogOutputChannel
test/
  unit/                       Mocha unit tests for transform + commentRanges
  integration/                @vscode/test-electron suite
```

### Critical design points

- **Pure transform core.** `transform.ts` accepts `(text, options, allowedRanges?)` and returns `{edits: {start, end, replacement}[]}`. All callers reuse it. `allowedRanges` lets callers restrict edits to e.g. comments-only.
- **Single regex per run.** Build one combined `RegExp` from the enabled categories, scan once, emit edits. O(n) per file. No category produces overlapping matches. Single-pass `String.prototype.replace` is fine for files up to 10 MB; no streaming/chunking under that size.
- **Edit application.** `TextEditor.edit` for selection/current-file. `WorkspaceEdit` + `vscode.workspace.applyEdit` for workspace and doc-files (single undo stop, atomic). Reverse-sort edits by offset before applying. For workspace runs of 500+ files, batch into chunks of 200-500 per `applyEdit` call. Treat a `false` return as partial-failure: collect rejected URIs and surface in the progress notification.
- **Async + parallelism.** File reads via `vscode.workspace.fs.readFile`. Run transforms with a small semaphore (default 8, max 16). Extension host is single-threaded JS, so concurrency only buys I/O overlap; Worker Threads are overkill for ≤10 MB regex. `vscode.window.withProgress` for UI feedback and cancellation.
- **Diagnostics (opt-in).** No language client. Single `DiagnosticCollection`; debounced 250 ms re-scan on `onDidChangeTextDocument`. Quick fix replaces the single occurrence; "Fix all in file" code action replaces all.
- **Paste provider.** `vscode.languages.registerDocumentPasteEditProvider(selector, provider, { providedDropOrPasteEditKinds: [DocumentDropOrPasteEditKind.Empty.append('text','dumb')], pasteMimeTypes: ['text/plain'] })`. Registered programmatically only when `onPaste.enabled` is true. Uses the unified drop/paste API stabilised around VS Code 1.100. Triggered only when the pasted content actually contains targeted chars (cheap pre-check).
- **Save hook.** `onWillSaveTextDocument` with `event.waitUntil(Promise<TextEdit[]>)`. `waitUntil` must be called **synchronously** inside the handler (calling it from a `setTimeout` throws). Bails early if disabled, file >1 MB, or no targeted chars present. Target <1 s of work.
- **Idle cost.** No timers, no file watchers, no work outside provider callbacks. Diagnostics provider only registers when its setting flips on. `activationEvents: []` (Microsoft's current sample default) - commands auto-activate on invocation. Heavy modules are `import()`-loaded lazily inside command handlers so the activation import graph stays tiny.
- **Memory hygiene.** Don't retain `TextDocument` references after a command completes. Construct `WorkspaceEdit` per-invocation, never cached. Push every `Disposable` into `context.subscriptions`. Null out large strings before awaiting long ops.
- **Logging.** `vscode.window.createOutputChannel('Dumb Formatter', { log: true })` returns a `LogOutputChannel` that respects the user's log level.

## package.json contributes

### Commands

- `dumb-formatter.replaceInFile`
- `dumb-formatter.replaceInSelection`
- `dumb-formatter.replaceInWorkspace`
- `dumb-formatter.replaceInDocFiles`
- `dumb-formatter.toggleDiagnostics`
- `dumb-formatter.enableOnSave` (walkthrough)
- `dumb-formatter.enableOnPaste` (walkthrough)
- `dumb-formatter.enableDiagnostics` (walkthrough)

### Walkthrough

`contributes.walkthroughs` with one walkthrough `dumb-formatter.gettingStarted`:

1. Welcome + what the extension does
2. Enable replace-on-save? - runs `dumb-formatter.enableOnSave`
3. Enable replace-on-paste? - runs `dumb-formatter.enableOnPaste`
4. Enable inline diagnostics? - runs `dumb-formatter.enableDiagnostics`
5. Try it - opens a sample buffer with smart chars

A `globalState` flag plus `showInformationMessage` is the fallback if the walkthrough fails to surface.

### Menus

- `editor/context` - selection + file commands when editor has focus
- `explorer/context` - file/folder-scoped replace
- `commandPalette` - all commands

### Configuration (all under `dumb-formatter.*`)

- `categories.dashes` (boolean, default true)
- `categories.dashesEmReplacement` (`"-"` | `"--"`, default `"-"`)
- `categories.quotes` (boolean, default true)
- `categories.whitespace` (boolean, default true)
- `categories.ellipsis` (boolean, default true)
- `categories.bullets` (boolean, default true)
- `categories.softHyphens` (boolean, default true)
- `categories.zeroWidth` (boolean, default true)
- `categories.invisibles` (boolean, default true)
- `categories.ligatures` (boolean, default false)
- `sourceCode.scope` (`"off"` | `"comments-only"` | `"all"`, default `"off"`)
- `commentMarkers` (object, languageId -> `{ line: string[], block: [string,string][] }` overrides)
- `onSave.enabled` (boolean, default false)
- `onPaste.enabled` (boolean, default false)
- `diagnostics.enabled` (boolean, default false)
- `diagnostics.severity` (`"error"` | `"warning"` | `"information"` | `"hint"`, default `"information"`)
- `maxFileSizeMB` (number, default 10)
- `workspace.respectGitignore` (boolean, default true)
- `workspace.respectVSCodeExcludes` (boolean, default true)
- `workspace.skipBinaries` (boolean, default true)
- `workspace.exclude` (string[] glob, default `[]`)
- `docFileExtensions` (string[], default `["md","markdown","mdx","rst","txt","adoc","asciidoc","org","typ"]`)

### Activation

```json
"activationEvents": ["onStartupFinished"]
```

`onStartupFinished` is required because users can opt in to save/paste/diagnostic hooks. Without an activation event, those hooks would not fire on subsequent VS Code launches until the user manually invoked a command. `onStartupFinished` runs after `*` extensions so it does not slow startup, and the activation work is cheap (register commands, read config, conditionally attach providers).

## Tooling

- **TypeScript** strict mode, target ES2022, module CommonJS (VS Code's Node host is CJS-only).
- **esbuild** for bundling. Don't pin `--target=node20` (VS Code controls the Node version). Conditional minify (production only) so dev sourcemaps remain useful:

  ```js
  // esbuild.mjs
  await esbuild.build({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['vscode'],
    outfile: 'dist/extension.js',
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production',
  })
  ```

  Bundle-size budget: <100 KB minified.
- **ESLint** flat config (`eslint.config.mjs`) with `typescript-eslint`. No prettier.
- **Tests:** `@vscode/test-cli` + `@vscode/test-electron` driven by a `.vscode-test.mjs` `defineConfig` (Microsoft's current recommended setup). Pure-mocha for transform unit tests.
- **vsce** + **ovsx** for marketplace + open-vsx publishing. No SVG icons; README image URLs must be `https`.
- **Package manager:** pnpm v10 (matches `vscode-ghostty-config-syntax`).

### Makefile targets

```
make install     # pnpm install --frozen-lockfile
make lint        # eslint
make test        # unit + integration
make build       # esbuild bundle
make package     # vsce package -> .vsix
make publish     # vsce publish && ovsx publish (requires VSCE_PAT, OVSX_PAT)
make clean
make watch       # esbuild --watch
make help
```

### CI (GitHub Actions)

- `ci.yml` on PR: install -> lint -> test -> build (Node 24, pnpm v10)
- `release.yml` on tag push: package -> publish to both registries -> create GitHub release with `.vsix`
- All config files (`tsconfig.json`, `package.json`, `.vscode/settings.json`, GitHub workflows) get `$schema` at the top where supported

## Latest package versions

To be confirmed at scaffold time via `pnpm view <pkg> version`. Reference baseline: `@types/vscode ^1.100.0`, `eslint 9.x`, `typescript 5.9.x`, `mocha 11.x`, `@vscode/test-cli 0.0.x`, `@vscode/test-electron 2.5.x`, `@vscode/vsce 3.7.x`, `esbuild` latest, `ignore` latest. Engines: `"vscode": "^1.100.0"`.

## Files to create

- `package.json` - manifest, contributes (commands, configuration, walkthroughs, menus), scripts
- `tsconfig.json` (with `$schema`)
- `eslint.config.mjs`
- `esbuild.mjs`
- `.vscode-test.mjs`
- `Makefile`
- `.vscodeignore`
- `.github/workflows/ci.yml`, `release.yml`
- `media/walkthrough/*.md` - walkthrough step content
- `src/extension.ts`
- `src/transform/categories.ts`
- `src/transform/transform.ts`
- `src/transform/commentRanges.ts`
- `src/commands/{currentFile,selection,workspace,docFiles}.ts`
- `src/providers/{diagnostics,codeActions,pasteEdit}.ts`
- `src/hooks/onSave.ts`
- `src/onboarding/firstRun.ts`
- `src/workspace/fileWalk.ts`
- `src/util/{config,sizeGuard,log}.ts`
- `test/unit/transform.test.ts`
- `test/unit/commentRanges.test.ts`
- `test/integration/extension.test.ts`
- `README.md`
- `CHANGELOG.md`
- `LICENSE` (MIT)

## Verification

- `make lint && make test && make build` clean
- `make package` produces a `.vsix`; install via `code --install-extension dumb-formatter-*.vsix`
- Unit tests: feed each category's characters in and assert the exact replacement string and edit ranges. Round-trip: ASCII input must produce zero edits
- Integration tests via `@vscode/test-electron`:
  - Open a fixture `.md` with mixed smart chars; run `replaceInFile`; assert document buffer matches expected
  - Selection-only command leaves out-of-selection text untouched
  - `sourceCode.scope=comments-only` on a `.ts` fixture only edits comment ranges
  - File-size guard: synthesise an 11 MB doc; assert warning surfaces and run still completes
  - Workspace command honours `.gitignore` (fixture repo with ignored file untouched)
  - Paste provider: programmatic paste via `vscode.env.clipboard.writeText` + `editor.action.clipboardPasteAction` rewrites pasted text when enabled
  - Save hook: write smart chars, save, assert buffer is dumb after save
- Manual smoke: install on real VS Code, paste sample text from Word containing em-dashes, smart quotes, NBSPs; verify each setting toggle changes behaviour as documented; check Extensions view "Runtime Status" shows zero activation overhead and idle CPU = 0%

## Validation sources

Architectural and performance choices validated against VS Code official docs (May 2026):

- code.visualstudio.com/api/references/extension-guidelines
- code.visualstudio.com/api/advanced-topics/extension-host
- code.visualstudio.com/api/references/activation-events
- code.visualstudio.com/api/references/vscode-api
- code.visualstudio.com/api/working-with-extensions/bundling-extension
- code.visualstudio.com/api/working-with-extensions/publishing-extension
- github.com/microsoft/vscode-extension-samples/tree/main/document-paste
- npmjs.com/package/@vscode/test-cli
- npmjs.com/package/@vscode/extension-telemetry
