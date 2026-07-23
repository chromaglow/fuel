/**
 * Module resolve hook so the test runner can load source that uses the
 * `@shared/*` alias (which electron-vite resolves at build time, but plain
 * Node does not). Registered via test/register.mjs.
 */
import { pathToFileURL, fileURLToPath } from 'node:url'
import { resolve as resolvePath } from 'node:path'
import { existsSync } from 'node:fs'

const PREFIX = '@shared/'
const SHARED_DIR = resolvePath(process.cwd(), 'src', 'shared')

export async function resolve(specifier, context, next) {
  if (specifier.startsWith(PREFIX)) {
    const rel = specifier.slice(PREFIX.length)
    const abs = resolvePath(SHARED_DIR, `${rel}.ts`)
    return next(pathToFileURL(abs).href, context)
  }
  // Source uses NodeNext-style `.js` extensions on relative imports (resolved
  // to `.ts` at build time). Plain Node doesn't; map them back to the source.
  if (
    specifier.endsWith('.js') &&
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    context.parentURL
  ) {
    const abs = fileURLToPath(new URL(specifier, context.parentURL))
    const tsAbs = `${abs.slice(0, -3)}.ts`
    if (existsSync(tsAbs) && !existsSync(abs)) {
      return next(pathToFileURL(tsAbs).href, context)
    }
  }
  return next(specifier, context)
}
