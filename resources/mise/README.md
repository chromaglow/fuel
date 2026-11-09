# Mise in fuel (trial)

`electron.cjs` is `mise/delivery/electron/index.cjs`, copied unmodified. `../mise-fonts/` holds the font files the HUD recipe uses (from `mise/fontdant/fonts`), served to the renderer as `mise-fonts://fonts/...` by the main process. `src/renderer/public/mise/` holds `mise.js`/`mise.css` (from `mise/delivery/dist`) and `recipe.js`, the HUD's recipe, applied in `<head>` before first paint.
