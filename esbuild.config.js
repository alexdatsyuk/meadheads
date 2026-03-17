import { readFileSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';

const result = await build({
  entryPoints: ['src/bookmarklet.ts'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2022',
  write: false,
});

const minified = result.outputFiles[0].text.trim();
const bookmarkletHref = `javascript:${minified}`;

const html = readFileSync('index.html', 'utf8');
const updated = html.replace(
  /href="javascript:[^"]*"/,
  `href="${bookmarkletHref.replace(/"/g, '&quot;')}"`,
);

writeFileSync('index.html', updated);
console.log(`Built bookmarklet (${bookmarkletHref.length} chars)`);
