/* Mise for Electron (build phase 6): local fonts through a privileged custom scheme, never file://.
   (Electron's own advice: don't disable webSecurity, prefer a custom protocol over file://; registerFileProtocol is
   deprecated since Electron 25, so this uses protocol.handle + net.fetch.)

   main process:
     const mise = require('@chromaglow/mise-delivery/electron');
     mise.registerSchemes();                              // before app 'ready'
     app.whenReady().then(() => {
       const fontsUrl = mise.serveFonts({ dir: path.join(__dirname, 'fonts') });   // 'mise-fonts://fonts'
       // optional: serve the app's pages too, so the page itself isn't file:// either
       mise.serveApp({ dir: path.join(__dirname, 'renderer') });                   // 'mise-app://app/index.html'
     });
   renderer: MiseApply.apply(recipe, { baseUrl: 'mise-fonts://fonts' }) in a <head> script (dist/mise.js), or write
   MiseApply.head(recipe, { baseUrl: 'mise-fonts://fonts' }).html into the HTML the main process serves.
   A page with a Content-Security-Policy needs  font-src 'self' mise-fonts:  (and style-src 'unsafe-inline' or a
   nonce for the <style> MiseApply writes).

   Only files under `dir` with a font extension are served; anything else, and any path that climbs out of `dir`,
   gets a 404. Fonts are served with Access-Control-Allow-Origin: * so any page origin can use them. */
'use strict';
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const FONT_TYPES = { '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const APP_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', ...FONT_TYPES };
const PRIVILEGES = { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true };

function electron() { return require('electron'); }

/** Call before app 'ready'. { fonts: 'mise-fonts', app: 'mise-app' } (app: false to leave it out) */
function registerSchemes(opts = {}) {
  const fonts = opts.fonts || 'mise-fonts', app = opts.app === false ? null : opts.app || 'mise-app';
  electron().protocol.registerSchemesAsPrivileged([fonts, app].filter(Boolean).map((scheme) => ({ scheme, privileges: PRIVILEGES })));
  return { fonts, app };
}

/** resolve a request to a file under dir, or null (outside dir, or not an allowed type) */
function resolveIn(dir, requestUrl, types) {
  const root = path.resolve(dir);
  let rel;
  try { rel = decodeURIComponent(new URL(requestUrl).pathname).replace(/^\/+/, ''); } catch { return null; }
  if (!rel || rel.includes('\0')) return null;
  const file = path.resolve(root, rel);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  const type = types[path.extname(file).toLowerCase()];
  return type ? { file, type } : null;
}

function handler(dir, types, extraHeaders) {
  return async (request) => {
    const hit = resolveIn(dir, request.url, types);
    if (!hit) return new Response('Not found', { status: 404 });
    let res;
    try { res = await electron().net.fetch(pathToFileURL(hit.file).toString()); } catch { return new Response('Not found', { status: 404 }); }
    if (!res.ok) return new Response('Not found', { status: 404 });
    return new Response(res.body, { status: 200, headers: { 'content-type': hit.type, ...extraHeaders } });
  };
}

/** Serve font files from dir at <scheme>://fonts/<path>. Returns the base URL for MiseApply ('mise-fonts://fonts'). */
function serveFonts(opts) {
  if (!opts || !opts.dir) throw new Error('serveFonts needs { dir }');
  const scheme = opts.scheme || 'mise-fonts', proto = opts.session ? opts.session.protocol : electron().protocol;
  proto.handle(scheme, handler(opts.dir, FONT_TYPES, { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=31536000, immutable' }));
  return scheme + '://fonts';
}

/** Serve an app folder (html, js, css, images, fonts) at <scheme>://app/<path>. Returns 'mise-app://app'. */
function serveApp(opts) {
  if (!opts || !opts.dir) throw new Error('serveApp needs { dir }');
  const scheme = opts.scheme || 'mise-app', proto = opts.session ? opts.session.protocol : electron().protocol;
  proto.handle(scheme, handler(opts.dir, APP_TYPES, { 'cache-control': 'no-cache' }));
  return scheme + '://app';
}

module.exports = { registerSchemes, serveFonts, serveApp, resolveIn, FONT_TYPES, PRIVILEGES };
