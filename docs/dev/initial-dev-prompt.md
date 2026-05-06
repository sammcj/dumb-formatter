I want to create a fast, lightweight, modern VS Code extension that has the sole purpose of finding and removing slash replacing smart formatting and hidden characters with standard plain formatting and characters.

The extension should be called dumb-formatter.

The things I think that should be in scope at least are as follows, but if you can think of any others, please let me know as I'd like to consider them:

- en-dashes
- em-dashes
- non-breaking spaces
- smart quotes (curly quotes)
- zero-width spaces
- soft hyphens
- other similar "smart" formatting characters that can cause issues when copying and pasting text, especially from sources like Microsoft Word or web pages.

Features:

- Replace smart formatting in current file
- Replace smart formatting in selected text
- Replace smart formatting across entire workspace
- Replace smart formatting in documentation files (scoped to .md .markdown .rst .txt)

Settings:

- Option to automatically replace smart formatting on paste from clipboard
- Option to automatically replace smart formatting on file save
- Option to specify maximum file size to operate on (default to 10MB, shows a warning and continues if tried on larger files)
- Configurable keybindings for commands (none assigned by default)

Other requirements:

- We must use the latest staple package versions throughout the application. You should use the tools available to you to ensure that you fetch the latest package versions rather than guessing them.
- The extension must be lightweight and not use a lot of memory when idle or CPU when idle. It is okay for it to use memory and CPU while processing, of course.
- The processing should be fast and asynchronous or parallelized where possible and safe to do so.
- We should ensure we use the latest available VS Code APIs and not use any deprecated or old APIs.
- The code base should have a make file that provides lint, test, build, package and publish or something similar to that.
- We should ensure that any configuration files have their schema set at the top of them if possible, so that we get proper warnings or errors when we have not correctly configured the extension.

I have published a couple of other extensions to the VS Code Marketplace before, feel free to look over them for inspiration or if applicable to copy files or patterns across, but don't feel that you have to use them if they are not what best suits our new extension. /Users/samm/git/sammcj/vscode-ghostty-config-syntax and /Users/samm/git/sammcj/m2e/vscode-extension

---

Please now feel free to use your multi choice Q&A tool to ask me any questions you have to clarify or improve the project or your understanding of it.

---

*User answered Claude's questions:
  ⎿ * Should the extension surface smart characters as live diagnostics with code-action quick fixes, or only act on explicit commands? → Both, diagnostics opt-in
     * How should the extension handle smart characters inside source code (string literals, comments, regex)? → Comments-only mode in source code would be great, but only if it doesn't significant increase complexity of
     the extension. Operating on source code should be a configurable option in the extensions settings.
     * Which character classes do you want in scope (extras beyond your list)? → Ellipsis (...) -> ..., Various Unicode spaces, Bullets (---) -> -, BOM, ZWJ/ZWNJ, bidi marks, word joiner
     * Build/bundling tool for the extension? → esbuild (Recommended)

*User answered Claude's questions:
  ⎿ * For workspace-wide operations, which files should be excluded by default? → Skip binary / non-text files, Respect .gitignore (Recommended), Respect files.exclude / search.exclude, User-defined glob excludes setting,
     All of these should be configurable in the extensions settings
     * Should each character category be individually toggleable in settings, or grouped? → Per-category toggles (Recommended)
     * Which file extensions count as 'documentation' for the doc-files command? → .md, .markdown, .rst, .txt (your list), Add .mdx, Add .adoc / .asciidoc, Add .org, .typ
     * Replace-on-paste is non-trivial in VS Code (no native paste-intercept event). Which approach? → DocumentPasteEditProvider API (Recommended)

* All clear. Drafting the plan file.

* Improvising... (1m 51s * ↓ 4.7k tokens * almost done thinking with high effort)
  ⎿ Tip: Use /theme to change the color theme

  > I think also what would be nice is when the extension is first installed, it should prompt the user which of the settings should be toggled on versus off.
  > Before we conclude planning, I'd like you to task a couple of sub agents in parallel with validating your approach to understanding what is modern and current best practice in VS Code to ensure we are aligning with
    that going forward.
