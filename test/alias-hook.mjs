/**
 * Module resolve hook so the test runner can load source that uses the
 * `@shared/*` alias (which electron-vite resolves at build time, but plain
 * Node does not). Registered via test/register.mjs.
 */
import { pathToFileURL } from 'node:url'
import { resolve as resolvePath } from 'node:path'

const PREFIX = '@shared/'
const SHARED_DIR = resolvePath(process.cwd(), 'src', 'shared')

export async function resolve(specifier, context, next) {
  if (specifier.startsWith(PREFIX)) {
    const rel = specifier.slice(PREFIX.length)
    const abs = resolvePath(SHARED_DIR, `${rel}.ts`)
    return next(pathToFileURL(abs).href, context)
  }
  return next(specifier, context)
}
