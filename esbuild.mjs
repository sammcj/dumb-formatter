import { build, context } from 'esbuild'

const watch = process.argv.includes('--watch')
const production = process.env.NODE_ENV === 'production'

const options = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['vscode'],
  outfile: 'dist/extension.js',
  minify: production,
  sourcemap: !production,
  logLevel: 'info',
}

if (watch) {
  const ctx = await context(options)
  await ctx.watch()
} else {
  await build(options)
}
