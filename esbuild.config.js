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

// Replace literal newlines with \\n so the bookmarklet survives HTML attribute parsing.
// Browsers normalize literal newlines inside href="" to spaces, breaking template literals.
const minified = result.outputFiles[0].text.trim().replace(/\n/g, '\\n');
const bookmarkletHref = `javascript:${minified}`;

const html = readFileSync('index.html', 'utf8');
const updated = html.replace(
  /href="javascript:[^"]*"/,
  `href="${bookmarkletHref.replace(/"/g, '&quot;')}"`,
);

writeFileSync('index.html', updated);
console.log(`Built bookmarklet (${bookmarkletHref.length} chars)`);
