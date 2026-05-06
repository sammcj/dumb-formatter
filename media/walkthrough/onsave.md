# Replace on save

When enabled, Dumb Formatter cleans smart characters out of your file each time you save it.

- Only runs on files whose extension is in `dumb-formatter.docFileExtensions` (defaults: `.md .markdown .mdx .rst .txt .adoc .asciidoc .org .typ`). Add other extensions to that list if you want them cleaned on save.
- Skipped automatically when the file contains no targeted characters.
- The save-hook has its own internal ceiling of 1 MB to keep saves fast. The general `maxFileSizeMB` setting (default 10 MB) governs the manual commands; if you save a doc file larger than 1 MB, the hook silently skips it and you can still clean it via _Replace Smart Formatting in File_.

Toggle later via _Settings > Dumb Formatter > On Save: Enabled_.
