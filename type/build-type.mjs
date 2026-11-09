// fuel's type from Mise (Mise build phase 7). Re-run after editing type/recipe.json or after a
// Mise update:   node type/build-type.mjs [recipe.json] [path-to-mise]
// Writes src/renderer/mise/ (fontdant.css, mise-type.css, recipe.json, fonts/ for the shipped fonts), used by the
// HUD and Fx Studio pages; electron-vite bundles the fonts. Fonts load with font-display: block (local files: ready at
// once; the web default, optional, can skip a font on a cold start and show the stand-in).
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..');
const recipe = resolve(root, process.argv[2] || 'type/recipe.json'), mise = process.argv[3] || 'C:/dev/GitHub/mise';
console.log(execFileSync(process.execPath, [join(mise, 'delivery', 'scripts', 'project.mjs'), recipe, join(root, 'src', 'renderer', 'mise'),
  '--base-url', './fonts', '--client-fonts', join(here, 'fonts'), '--display', 'block'], { windowsHide: true, encoding: 'utf8' }).trim());
