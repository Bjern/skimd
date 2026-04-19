import { defineConfig } from 'tsup';
import { chmodSync } from 'node:fs';

export default defineConfig({
  entry: { cli: 'src/cli.ts' },
  format: ['esm'],
  target: 'node20',
  clean: true,
  minify: false,
  splitting: false,
  shims: false,
  banner: { js: '#!/usr/bin/env node' },
  outDir: 'dist',
  onSuccess: async () => {
    // Without +x on dist/cli.js, POSIX npm installs silently fail: the bin
    // symlink won't exec the target and the command appears to do nothing.
    // Windows ignores the mode bit (it uses a .cmd shim that invokes node).
    try {
      chmodSync('dist/cli.js', 0o755);
    } catch {
      /* non-POSIX — ignored */
    }
  },
});
