# Changelog

All notable changes to this extension are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Initial release.
- Commands: replace in current file, selection, workspace, documentation files.
- Per-category toggles for dashes, quotes, whitespace, ellipsis, bullets, soft hyphens, zero-width spaces, invisibles, and ligatures (all on by default).
- `sourceCode.scope` setting (`off` / `comments-only` / `all`) with per-language comment-marker map.
- Optional replace-on-save via `onWillSaveTextDocument`.
- Optional replace-on-paste via `DocumentPasteEditProvider`.
- Optional inline diagnostics with quick-fix code actions.
- File-size guard (10 MB default, warn-and-continue).
- Workspace traversal honouring `.gitignore`, `files.exclude`, `search.exclude`, user globs, and binary detection.
- First-run walkthrough for opt-in features.
