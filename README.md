# Dumb Formatter

Strips smart Unicode formatting and hidden characters out of your text and replaces them with plain ASCII.

Useful when you paste from Word, Google Docs, web pages, ChatGPT or Claude into source code, markdown, or commit messages and end up with em-dashes that break diffs, smart quotes that break regex, and zero-width characters you can't see.

Targets em-dashes, en-dashes, smart quotes, non-breaking spaces, ellipsis, bullets, soft hyphens, zero-width spaces, BOM, ZWJ/ZWNJ, bidi formatting marks, word joiner, and presentation-form ligatures. Each category is individually toggleable.

## Commands

- **Dumb Formatter: Replace Smart Formatting in File**
- **Dumb Formatter: Replace Smart Formatting in Selection**
- **Dumb Formatter: Replace Smart Formatting Across Workspace**
- **Dumb Formatter: Replace Smart Formatting in Documentation Files** (`.md .markdown .mdx .rst .txt .adoc .asciidoc .org .typ` by default)
- **Dumb Formatter: Toggle Inline Diagnostics**

No keybindings are bound by default. Bind any of the commands via _File > Preferences > Keyboard Shortcuts_.

## Optional automatic features

All disabled by default. Toggle via the first-run walkthrough or under _Settings > Dumb Formatter_.

- `dumb-formatter.onSave.enabled` - clean smart characters on save (skipped for files larger than 1 MB).
- `dumb-formatter.onPaste.enabled` - clean pasted text as it lands in the editor.
- `dumb-formatter.diagnostics.enabled` - highlight smart characters inline with quick-fix code actions.

## File-type scope

Auto features (replace-on-save and inline diagnostics) only fire on files whose extension is in `dumb-formatter.docFileExtensions` (defaults: `md markdown mdx rst txt adoc asciidoc org typ`). To enable auto-cleanup on another extension, add it to that list.

Manual commands (Replace in File, Replace in Selection) and the paste hook work on any file - they only run when you explicitly invoke them.

## Workspace exclusions

For workspace-wide and doc-file commands:

- `dumb-formatter.workspace.respectGitignore` (default true) - skip files matched by `.gitignore`.
- `dumb-formatter.workspace.respectVSCodeExcludes` (default true) - honour `files.exclude` and `search.exclude`.
- `dumb-formatter.workspace.skipBinaries` (default true) - skip files detected as binary.
- `dumb-formatter.workspace.exclude` - additional glob patterns.

## Configuration reference

See _Settings > Dumb Formatter_ for the full list. Key settings:

- `dumb-formatter.categories.*` - per-category on/off (`dashes`, `quotes`, `whitespace`, `ellipsis`, `bullets`, `softHyphens`, `zeroWidth`, `invisibles`, `ligatures`).
- `dumb-formatter.categories.dashesEmReplacement` - `-` (default) or `--` for em-dash.
- `dumb-formatter.maxFileSizeMB` - default 10. Files larger than this trigger a warning but processing still continues.
- `dumb-formatter.diagnostics.severity` - `error` / `warning` / `information` (default) / `hint`.

## Development

```sh
make install
make lint
make test
make build
make package
```

## Licence

MIT.
