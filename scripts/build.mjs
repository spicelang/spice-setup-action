import { build } from 'esbuild';
import { writeFile, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
// Mark dist/ as ESM so Node treats the bundle as a module even if the action
// is consumed without the repo root package.json being visible.
await writeFile('dist/package.json', '{\n  "type": "module"\n}\n');

await build({
  entryPoints: ['src/setup-spice.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: 'dist/index.js',
  legalComments: 'none',
  // Shim CJS-isms (createRequire, __filename, __dirname) so any bundled CJS
  // dependency or Node-builtin require call still works inside the ESM output.
  banner: {
    js: [
      "import { createRequire as __esbuildCreateRequire } from 'module';",
      "import { fileURLToPath as __esbuildFileURLToPath } from 'url';",
      "import { dirname as __esbuildDirname } from 'path';",
      "const require = __esbuildCreateRequire(import.meta.url);",
      "const __filename = __esbuildFileURLToPath(import.meta.url);",
      "const __dirname = __esbuildDirname(__filename);"
    ].join('\n')
  }
});
