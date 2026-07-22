import { register } from 'node:module'

// Install the @shared/* resolver for every module loaded after this point.
register('./alias-hook.mjs', import.meta.url)
