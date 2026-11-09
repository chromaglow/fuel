/* Mise delivery bundle: frosting colours + fontdant type + kitchen recipe/Sprinkles + MiseApply.
   Built by delivery/scripts/build.mjs from: frosting/dist/tokens.js, frosting/src/readability.js, fontdant/dist/type-tokens.js, fontdant/dist/library.js, fontdant/src/fontface.js, fontdant/src/typecheck.js, fontdant/src/emit.js, kitchen/src/recipe.js, kitchen/src/sprinkles.js, delivery/src/apply.js, delivery/src/dtcg.js. Do not edit; edit the sources. */
/* ── frosting/dist/tokens.js ── */
/* frosting tokens v1.0.0 — generated from tokens.json; do not edit. Plain script: window.FrostingTokens, or require()-able. */
(function (root) {
  var api = {
  "version": "1.0.0",
  "prefix": "fr",
  "groups": {
    "core": "Always present. Every frosted page uses these.",
    "status": "Optional. Dashboards and monitors: dots, meters, badges.",
    "series": "Optional. Chart lines and bars, in order of use."
  },
  "roles": [
    {
      "name": "bg",
      "group": "core",
      "label": "Background",
      "use": "The page or window background.",
      "light": "#FFFFFF",
      "dark": "#0F1115"
    },
    {
      "name": "surface",
      "group": "core",
      "label": "Surface",
      "use": "Cards, panels, soft surfaces that sit on the background.",
      "light": "#F5F3EF",
      "dark": "#171A21"
    },
    {
      "name": "border",
      "group": "core",
      "label": "Border",
      "use": "Lines, dividers, card edges.",
      "light": "#E3DED6",
      "dark": "#262B36"
    },
    {
      "name": "text",
      "group": "core",
      "label": "Text",
      "use": "Main reading text.",
      "light": "#1C1B19",
      "dark": "#E6E8EE"
    },
    {
      "name": "muted",
      "group": "core",
      "label": "Quiet text",
      "use": "Secondary text, labels, captions. Still has to be readable.",
      "light": "#5E5A53",
      "dark": "#8A92A6"
    },
    {
      "name": "accent",
      "group": "core",
      "label": "Accent",
      "use": "Shapes, icons, highlights, the logo. Not for body text.",
      "light": "#2E7D4F",
      "dark": "#9D7BFF"
    },
    {
      "name": "accent-text",
      "group": "core",
      "label": "Accent text",
      "use": "Accent-coloured text and links. A readable cousin of accent.",
      "light": "#22603C",
      "dark": "#B9A3FF"
    },
    {
      "name": "button",
      "group": "core",
      "label": "Button",
      "use": "Primary action fill.",
      "light": "#2E7D4F",
      "dark": "#9D7BFF"
    },
    {
      "name": "button-text",
      "group": "core",
      "label": "Button text",
      "use": "Text on the primary button.",
      "light": "#FFFFFF",
      "dark": "#0F1115"
    },
    {
      "name": "progress-fill",
      "group": "core",
      "label": "Progress fill",
      "use": "The filled part of meters and progress bars.",
      "light": "#2E7D4F",
      "dark": "#9D7BFF"
    },
    {
      "name": "progress-track",
      "group": "core",
      "label": "Progress track",
      "use": "The empty part of meters and progress bars.",
      "light": "#E7E3DC",
      "dark": "#262B36"
    },
    {
      "name": "ok",
      "group": "status",
      "label": "OK",
      "use": "Healthy, up, done. Dots, meters, badge fills.",
      "light": "#2E7D4F",
      "dark": "#3DDC84"
    },
    {
      "name": "warn",
      "group": "status",
      "label": "Warning",
      "use": "Needs attention soon.",
      "light": "#B45309",
      "dark": "#FFCC4D"
    },
    {
      "name": "bad",
      "group": "status",
      "label": "Bad",
      "use": "Down, failed, over the line.",
      "light": "#C8402F",
      "dark": "#FF5C6C"
    },
    {
      "name": "series-1",
      "group": "series",
      "label": "Series 1",
      "use": "First chart line or bar.",
      "light": "#1F5F8B",
      "dark": "#4FB3FF"
    },
    {
      "name": "series-2",
      "group": "series",
      "label": "Series 2",
      "use": "Second chart line or bar.",
      "light": "#D9622B",
      "dark": "#FFB454"
    },
    {
      "name": "series-3",
      "group": "series",
      "label": "Series 3",
      "use": "Third chart line or bar.",
      "light": "#6B2D5C",
      "dark": "#C084FC"
    },
    {
      "name": "series-4",
      "group": "series",
      "label": "Series 4",
      "use": "Fourth chart line or bar.",
      "light": "#5C6B3A",
      "dark": "#5FE0A8"
    }
  ],
  "contracts": [
    {
      "label": "Text on background",
      "role": "text",
      "against": "bg",
      "min": 7
    },
    {
      "label": "Text on surfaces",
      "role": "text",
      "against": "surface",
      "min": 7
    },
    {
      "label": "Quiet text",
      "role": "muted",
      "against": "bg",
      "min": 4.5
    },
    {
      "label": "Quiet text on surfaces",
      "role": "muted",
      "against": "surface",
      "min": 4.5
    },
    {
      "label": "Accent text",
      "role": "accent-text",
      "against": "bg",
      "min": 4.5
    },
    {
      "label": "Accent text on surfaces",
      "role": "accent-text",
      "against": "surface",
      "min": 4.5
    },
    {
      "label": "Accent shapes",
      "role": "accent",
      "against": "bg",
      "min": 3
    },
    {
      "label": "Button shape",
      "role": "button",
      "against": "bg",
      "min": 3
    },
    {
      "label": "Button text",
      "role": "button-text",
      "against": "button",
      "min": 4.5
    },
    {
      "label": "Progress bar",
      "role": "progress-fill",
      "against": "progress-track",
      "min": 3
    },
    {
      "label": "Progress on background",
      "role": "progress-fill",
      "against": "bg",
      "min": 3
    },
    {
      "label": "OK dot",
      "role": "ok",
      "against": "bg",
      "min": 3
    },
    {
      "label": "OK dot on surfaces",
      "role": "ok",
      "against": "surface",
      "min": 3
    },
    {
      "label": "Warning dot",
      "role": "warn",
      "against": "bg",
      "min": 3
    },
    {
      "label": "Warning dot on surfaces",
      "role": "warn",
      "against": "surface",
      "min": 3
    },
    {
      "label": "Bad dot",
      "role": "bad",
      "against": "bg",
      "min": 3
    },
    {
      "label": "Bad dot on surfaces",
      "role": "bad",
      "against": "surface",
      "min": 3
    },
    {
      "label": "Series 1",
      "role": "series-1",
      "against": "bg",
      "min": 3
    },
    {
      "label": "Series 2",
      "role": "series-2",
      "against": "bg",
      "min": 3
    },
    {
      "label": "Series 3",
      "role": "series-3",
      "against": "bg",
      "min": 3
    },
    {
      "label": "Series 4",
      "role": "series-4",
      "against": "bg",
      "min": 3
    }
  ],
  "light": {
    "bg": "#FFFFFF",
    "surface": "#F5F3EF",
    "border": "#E3DED6",
    "text": "#1C1B19",
    "muted": "#5E5A53",
    "accent": "#2E7D4F",
    "accent-text": "#22603C",
    "button": "#2E7D4F",
    "button-text": "#FFFFFF",
    "progress-fill": "#2E7D4F",
    "progress-track": "#E7E3DC",
    "ok": "#2E7D4F",
    "warn": "#B45309",
    "bad": "#C8402F",
    "series-1": "#1F5F8B",
    "series-2": "#D9622B",
    "series-3": "#6B2D5C",
    "series-4": "#5C6B3A"
  },
  "dark": {
    "bg": "#0F1115",
    "surface": "#171A21",
    "border": "#262B36",
    "text": "#E6E8EE",
    "muted": "#8A92A6",
    "accent": "#9D7BFF",
    "accent-text": "#B9A3FF",
    "button": "#9D7BFF",
    "button-text": "#0F1115",
    "progress-fill": "#9D7BFF",
    "progress-track": "#262B36",
    "ok": "#3DDC84",
    "warn": "#FFCC4D",
    "bad": "#FF5C6C",
    "series-1": "#4FB3FF",
    "series-2": "#FFB454",
    "series-3": "#C084FC",
    "series-4": "#5FE0A8"
  }
};
  root.FrostingTokens = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* ── frosting/src/readability.js ── */
/* frosting · Part B · readability
   Colour math and the contrast contracts. Pure logic, no DOM. Loaded as a plain script
   (window.FrostingColor) or require()-able from Node. Lifted from GoFund Ezra's palettes.js. */
(function (root) {
  'use strict';

  /* ── colour math ── */
  function hexToRgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function rgbToHex(c) { return '#' + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join('').toUpperCase(); }
  function rgbToHsl(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s * 100, l: l * 100 };
  }
  function hslToRgb(o) {
    var h = ((o.h % 360) + 360) % 360 / 360, s = Math.max(0, Math.min(100, o.s)) / 100, l = Math.max(0, Math.min(100, o.l)) / 100;
    if (!s) return [l * 255, l * 255, l * 255];
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    function f(t) { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  var hsl = function (hex) { return rgbToHsl(hexToRgb(hex)); };
  var hex = function (o) { return rgbToHex(hslToRgb(o)); };
  function lum(h) {
    return hexToRgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
      .reduce(function (a, v, i) { return a + v * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }
  /* WCAG contrast ratio, 1..21 */
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function mix(a, b, t) { var x = hexToRgb(a), y = hexToRgb(b); return rgbToHex(x.map(function (v, i) { return v + (y[i] - v) * t; })); }
  function isDark(bg) { return contrast(bg, '#FFFFFF') > contrast(bg, '#000000'); }
  var HEX = /^#[0-9a-fA-F]{6}$/;

  /* Keep the hue and saturation, move only the lightness: the closest lightness that passes every rule.
     rules: [[againstHex, minRatio], …]. Falls back to less saturation, then to plain black or white. */
  function fit(color, rules) {
    var o = hsl(color);
    function passes(h) { return rules.every(function (r) { return contrast(h, r[0]) >= r[1]; }); }
    if (passes(color)) return color;
    var sats = [o.s, o.s * 0.6, o.s * 0.3, 0];
    for (var si = 0; si < sats.length; si++) {
      var best = null, bestD = 1e9;
      for (var L = 0; L <= 100; L += 0.5) {
        var c = hex({ h: o.h, s: sats[si], l: L });
        if (passes(c) && Math.abs(L - o.l) < bestD) { best = c; bestD = Math.abs(L - o.l); }
      }
      if (best) return best;
    }
    return ['#000000', '#FFFFFF'].filter(passes)[0] || '#000000';
  }
  /* The dark or light ink that reads best on a colour, gently tinted with a hue (default: the colour's own). */
  function ink(on, hue) {
    if (hue == null) hue = hsl(on).h;
    var dark = hex({ h: hue, s: 18, l: 10 }), light = hex({ h: hue, s: 20, l: 97 });
    return contrast(on, dark) >= contrast(on, light) ? dark : light;
  }
  /* Can any text colour reach 7:1 on this background? (Mid-tones can't.) */
  function bgHeadroom(bg) { return Math.max(contrast(bg, '#FFFFFF'), contrast(bg, '#000000')); }

  /* ── contracts ──
     check(theme, contracts): contracts default to tokens.json's list (via FrostingTokens) plus any
     registered by extensions. Returns [{label, ratio, min, ok}] in contract order; a missing role fails. */
  var extra = [];
  function contracts() { return ((root.FrostingTokens && root.FrostingTokens.contracts) || []).concat(extra); }
  function check(theme, list) {
    return (list || contracts()).map(function (c) {
      var a = theme[c.role], b = theme[c.against], r = HEX.test(a || '') && HEX.test(b || '') ? contrast(a, b) : 0;
      return { label: c.label, role: c.role, against: c.against, ratio: Math.round(r * 10) / 10, min: c.min, ok: r >= c.min };
    });
  }
  function addContracts(list) { extra = extra.concat(list); }

  var api = {
    hexToRgb: hexToRgb, rgbToHex: rgbToHex, hsl: hsl, hex: hex, lum: lum, contrast: contrast, mix: mix, isDark: isDark,
    fit: fit, ink: ink, bgHeadroom: bgHeadroom, check: check, contracts: contracts, addContracts: addContracts, HEX: HEX,
  };
  root.FrostingColor = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* ── fontdant/dist/type-tokens.js ── */
/* fontdant type tokens v0.1.0 — generated from type-tokens.json; do not edit. Plain script: window.FontdantTokens, or require()-able. */
(function (root) {
  var api = {
  "version": "0.1.0",
  "prefix": "fd",
  "groups": {
    "core": "Always present. Every fontdant page uses these.",
    "data": "Optional. Big tabular numerals on dashboards, gauges and KPI tiles."
  },
  "faces": {
    "about": "The three standard face slots. Each carries the fit target its aliases are normalised to (proposal §5, regime B): the build emits one @font-face alias per font × slot with size-adjust = target ÷ (font metric ÷ UPM). Targets are Inter's own ratios (measured), so the default look renders at 100%. The default look itself lives in fonts/library-source.json.",
    "display": {
      "label": "Display face",
      "use": "Hero lines, wordmarks, the two large heading steps.",
      "generic": "system-ui, sans-serif",
      "fit": {
        "metric": "cap-height",
        "target": 0.7275
      },
      "loading": "swap"
    },
    "text": {
      "label": "Text face",
      "use": "Reading text, UI, captions, eyebrows, small headings.",
      "generic": "system-ui, -apple-system, 'Segoe UI', sans-serif",
      "fit": {
        "metric": "ex-height",
        "target": 0.5459
      },
      "loading": "swap"
    },
    "mono": {
      "label": "Mono face",
      "use": "Code, terminal output, identifiers, lowercase eyebrows.",
      "generic": "ui-monospace, 'Cascadia Code', Consolas, monospace",
      "fit": {
        "metric": "ex-height",
        "matchFace": "text"
      },
      "loading": "optional"
    }
  },
  "weights": {
    "regular": 400,
    "emph": 500,
    "title": 600,
    "bold": 700,
    "display": 800
  },
  "stepOrder": [
    "xs",
    "sm",
    "md",
    "lg",
    "h-sm",
    "h-md",
    "h-lg",
    "h-xl",
    "display"
  ],
  "defaultMode": "reading",
  "scalingRange": [
    1,
    1.25
  ],
  "modes": {
    "dense": {
      "label": "Dense",
      "use": "Tools, consoles, admin. WEYLD booth's ladder 12/13/14/15/16; body holds at 14px (F1).",
      "steps": {
        "xs": "0.75rem",
        "sm": "0.8125rem",
        "md": "0.875rem",
        "lg": "0.9375rem",
        "h-sm": "1rem",
        "h-md": "1.125rem",
        "h-lg": "1.375rem",
        "h-xl": "1.75rem",
        "display": "2.25rem"
      },
      "floors": {
        "any": 12,
        "body": 14,
        "body-sm": 14,
        "ui": 12,
        "ui-sm": 12
      }
    },
    "reading": {
      "label": "Reading",
      "use": "Sites, docs, long form. GoFund's and deadend's ladders; fluid only for h-xl and display.",
      "steps": {
        "xs": "0.75rem",
        "sm": "0.8125rem",
        "md": "0.9375rem",
        "lg": "1.0625rem",
        "h-sm": "1.1875rem",
        "h-md": "1.375rem",
        "h-lg": "1.75rem",
        "h-xl": "clamp(2rem, 1.5rem + 1.5vw, 2.5rem)",
        "display": "clamp(2.5rem, 1.5rem + 4vw, 4.75rem)"
      },
      "floors": {
        "any": 12,
        "body": 16,
        "body-sm": 14,
        "ui": 14,
        "ui-sm": 13
      }
    }
  },
  "features": {
    "about": "Boolean flags any role, step or variant may set.",
    "tnum": "font-variant-numeric: tabular-nums",
    "case": "text-transform: upper | lower | none",
    "italic": "font-style: italic",
    "strong": "one weight dial up"
  },
  "roles": [
    {
      "name": "display",
      "group": "core",
      "label": "Display",
      "use": "Hero lines, wordmarks, empty-state titles.",
      "face": "display",
      "size": "display",
      "weight": "display",
      "leading": 1.05,
      "tracking": "-0.02em",
      "loading": "swap"
    },
    {
      "name": "heading",
      "group": "core",
      "label": "Heading",
      "use": "Section, card and dialog headings. Steps xl lg md sm; the embedded scope compresses them inside messages and cards.",
      "face": "text",
      "weight": "title",
      "leading": 1.2,
      "tracking": "0",
      "defaultStep": "md",
      "loading": "swap",
      "steps": {
        "xl": {
          "size": "h-xl",
          "face": "display",
          "tracking": "-0.01em"
        },
        "lg": {
          "size": "h-lg",
          "face": "display",
          "tracking": "-0.01em"
        },
        "md": {
          "size": "h-md",
          "tracking": {
            "dense": "0",
            "reading": "-0.01em"
          }
        },
        "sm": {
          "size": "h-sm"
        }
      },
      "scopes": {
        "embedded": {
          "xl": {
            "size": "h-md"
          },
          "lg": {
            "size": "h-sm"
          },
          "md": {
            "size": "lg"
          },
          "sm": {
            "size": "lg"
          }
        }
      }
    },
    {
      "name": "body",
      "group": "core",
      "label": "Body",
      "use": "Reading text, chat messages, lists; table cells use body-sm with tnum. Never below 14px, even in dense (F1).",
      "face": "text",
      "size": {
        "dense": "md",
        "reading": "lg"
      },
      "weight": "regular",
      "leading": 1.5,
      "tracking": "0",
      "measure": "65ch",
      "align": "start",
      "loading": "optional",
      "steps": {
        "sm": {
          "size": {
            "dense": "md",
            "reading": "md"
          }
        }
      }
    },
    {
      "name": "ui",
      "group": "core",
      "label": "UI",
      "use": "Buttons, labels, inputs, nav, tabs, badges, the composer. One role; variants button, nav, input (F2).",
      "face": "text",
      "size": {
        "dense": "sm",
        "reading": "md"
      },
      "weight": "title",
      "leading": 1.3,
      "tracking": "0",
      "tnum": true,
      "loading": "optional",
      "steps": {
        "sm": {
          "size": {
            "dense": "xs",
            "reading": "sm"
          }
        }
      },
      "variants": {
        "button": {
          "weight": "title"
        },
        "nav": {
          "weight": "emph"
        },
        "input": {
          "weight": "regular",
          "coarseFloor": "1rem"
        }
      }
    },
    {
      "name": "caption",
      "group": "core",
      "label": "Caption",
      "use": "Meta, hints, timestamps, status lines, source chips, fine print. Usually in frosting's muted colour.",
      "face": "text",
      "size": {
        "dense": "xs",
        "reading": "sm"
      },
      "weight": "regular",
      "leading": 1.4,
      "tracking": "0",
      "tnum": true,
      "loading": "optional"
    },
    {
      "name": "eyebrow",
      "group": "core",
      "label": "Eyebrow",
      "use": "Kicker above a heading, table header, section label, chip text. Variants upper (default) and lower (mono, lowercase).",
      "face": "text",
      "size": "xs",
      "weight": "title",
      "leading": 1.2,
      "tracking": "0.08em",
      "case": "upper",
      "loading": "optional",
      "variants": {
        "upper": {},
        "lower": {
          "face": "mono",
          "case": "lower",
          "tracking": "0.02em"
        }
      }
    },
    {
      "name": "mono",
      "group": "core",
      "label": "Mono",
      "use": "Code inline and block, terminal output, diffs, identifiers. Steps block (default) and inline (em, relative to the surrounding text).",
      "face": "mono",
      "size": {
        "dense": "sm",
        "reading": "md"
      },
      "weight": "regular",
      "leading": 1.5,
      "tracking": "0",
      "defaultStep": "block",
      "loading": "optional",
      "steps": {
        "block": {},
        "inline": {
          "size": "0.9em"
        }
      }
    },
    {
      "name": "metric",
      "group": "data",
      "label": "Metric",
      "use": "Big tabular numerals: gauges, KPI tiles, progress amounts, deck numerals. Any step from lg to display.",
      "face": "text",
      "size": "h-lg",
      "weight": "title",
      "leading": 1,
      "tracking": "0",
      "tnum": true,
      "loading": "swap"
    }
  ],
  "contracts": [
    {
      "id": "T1",
      "label": "Relative units",
      "level": "hard",
      "source": "WCAG 1.4.4",
      "rule": "every size is rem or em, or clamp() containing a rem term"
    },
    {
      "id": "T2",
      "label": "Unitless leading, em spacing",
      "level": "hard",
      "source": "WCAG 1.4.12",
      "rule": "leading is a unitless number; tracking is in em"
    },
    {
      "id": "T3",
      "label": "Body leading",
      "level": "hard",
      "source": "WCAG 1.4.8 / 1.4.12",
      "role": "body",
      "property": "leading",
      "min": 1.5
    },
    {
      "id": "T4",
      "label": "Measure",
      "level": "hard",
      "source": "WCAG 1.4.8",
      "role": "body",
      "property": "measure",
      "max": 80,
      "warnBand": [
        45,
        75
      ]
    },
    {
      "id": "T5",
      "label": "Floors",
      "level": "hard",
      "source": "Q4, F1; Apple HIG 11pt; WEYLD floor(12)",
      "rule": "per-mode floors in modes.*.floors, checked at the minimum scaling"
    },
    {
      "id": "T6",
      "label": "Order",
      "level": "hard",
      "source": "WEYLD fit",
      "rule": "steps strictly increasing within a mode"
    },
    {
      "id": "T7",
      "label": "Weight floor",
      "level": "warn",
      "source": "Apple HIG; WCAG 1.4.3 note",
      "rule": "weight < 400 below 24px warns; weight < 300 below 24px is hard"
    },
    {
      "id": "T8",
      "label": "Uppercase tracking",
      "level": "warn",
      "source": "Butterick",
      "rule": "case upper implies tracking >= 0.05em"
    },
    {
      "id": "T9",
      "label": "Tracking sign",
      "level": "hard",
      "source": "Apple SF tracking table",
      "rule": "negative tracking only when size >= 20px"
    },
    {
      "id": "T10",
      "label": "Leading bands",
      "level": "warn",
      "source": "convention",
      "bands": {
        "heading": [
          1.15,
          1.35
        ],
        "display": [
          1,
          1.25
        ],
        "ui": [
          1.3,
          null
        ],
        "mono": [
          1.4,
          null
        ]
      }
    },
    {
      "id": "T11",
      "label": "Swap normalisation",
      "level": "warn",
      "source": "Beier 2012",
      "needs": "font-metrics",
      "rule": "face change with x-height ratio delta > 10% requires a fit target"
    },
    {
      "id": "T12",
      "label": "Mono matches body",
      "level": "warn",
      "source": "VS Code, chat kits",
      "needs": "font-metrics",
      "rule": "adjusted x-heights of mono and body within 5%"
    },
    {
      "id": "T13",
      "label": "Rendered survival",
      "level": "hard",
      "source": "WCAG 1.4.12, 1.4.10, 1.4.4",
      "needs": "render",
      "rule": "survives the 1.4.12 overrides and reflows at 320px; zoom never blocked"
    },
    {
      "id": "T14",
      "label": "Weight availability",
      "level": "hard",
      "source": "font mechanics",
      "needs": "font-metrics",
      "rule": "the role's weight exists in the face; never synthesised"
    },
    {
      "id": "T15",
      "label": "Composer floor",
      "level": "hard",
      "source": "iOS zoom; LibreChat",
      "role": "ui",
      "variant": "input",
      "property": "coarseFloor",
      "minPx": 16
    },
    {
      "id": "T16",
      "label": "Paragraph spacing",
      "level": "warn",
      "source": "WCAG 1.4.8",
      "rule": "body paragraph space >= 1.5 x leading (derived, always holds)"
    },
    {
      "id": "T17",
      "label": "Body styling",
      "level": "warn",
      "source": "WCAG 1.4.8; dyslexia guidance",
      "rule": "body is not justified, not italic, not uppercase by default"
    }
  ],
  "styles": [
    {
      "name": "display",
      "role": "display",
      "variant": false
    },
    {
      "name": "heading",
      "role": "heading",
      "variant": false
    },
    {
      "name": "heading-xl",
      "role": "heading",
      "variant": false
    },
    {
      "name": "heading-lg",
      "role": "heading",
      "variant": false
    },
    {
      "name": "heading-md",
      "role": "heading",
      "variant": false
    },
    {
      "name": "heading-sm",
      "role": "heading",
      "variant": false
    },
    {
      "name": "body",
      "role": "body",
      "variant": false
    },
    {
      "name": "body-sm",
      "role": "body",
      "variant": false
    },
    {
      "name": "ui",
      "role": "ui",
      "variant": false
    },
    {
      "name": "ui-sm",
      "role": "ui",
      "variant": false
    },
    {
      "name": "ui-button",
      "role": "ui",
      "variant": true
    },
    {
      "name": "ui-nav",
      "role": "ui",
      "variant": true
    },
    {
      "name": "ui-input",
      "role": "ui",
      "variant": true
    },
    {
      "name": "caption",
      "role": "caption",
      "variant": false
    },
    {
      "name": "eyebrow",
      "role": "eyebrow",
      "variant": false
    },
    {
      "name": "eyebrow-upper",
      "role": "eyebrow",
      "variant": true
    },
    {
      "name": "eyebrow-lower",
      "role": "eyebrow",
      "variant": true
    },
    {
      "name": "mono",
      "role": "mono",
      "variant": false
    },
    {
      "name": "mono-block",
      "role": "mono",
      "variant": false
    },
    {
      "name": "mono-inline",
      "role": "mono",
      "variant": false
    },
    {
      "name": "metric",
      "role": "metric",
      "variant": false
    }
  ]
};
  root.FontdantTokens = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* ── fontdant/dist/library.js ── */
/* fontdant font library v0.1.0 — generated from fonts/library.json; do not edit. Plain script: window.FontdantLibrary, or require()-able. */
(function (root) {
  var lib = {"version":"0.1.0","about":"Generated by scripts/build-library.mjs from fonts/library-source.json and the fetched files; do not edit. Metrics are font units unless named ratios.","defaultLook":{"display":"inter","text":"inter","mono":"jetbrains-mono"},"shelves":{"compact-sans":{"label":"Compact modern sans","slots":["text","display"]},"text":{"label":"Text faces","slots":["text","display"]},"display-classic":{"label":"Display · classic","slots":["display"]},"display-trendy":{"label":"Display · trendy","slots":["display"]},"mono":{"label":"Mono","slots":["mono"]}},"fonts":{"inter":{"id":"inter","family":"Inter","shelf":"compact-sans","slots":["text","display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"inter-latin-wght.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":72920},{"style":"italic","file":"inter-latin-wght-italic.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":79716,"metrics":{"hhea":{"ascent":1984,"descent":-494,"lineGap":0},"typo":{"ascent":1984,"descent":-494,"lineGap":0},"win":{"ascent":2269,"descent":660},"capHeight":1490,"xHeight":1118,"xWidthAvg":978}}],"weights":{"kind":"variable","min":100,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":100,"max":900},"axes":{"opsz":[14,14,32],"wght":[100,400,900]},"metrics":{"names":{"family":"Inter","fullName":"Inter Regular","postscriptName":"Inter-Regular"},"unitsPerEm":2048,"hhea":{"ascent":1984,"descent":-494,"lineGap":0},"typo":{"ascent":1984,"descent":-494,"lineGap":0},"win":{"ascent":2269,"descent":660},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":1490,"xHeight":1118,"xWidthAvg":972,"zeroAdvance":1292,"ratios":{"cap":0.7275,"x":0.5459,"xWidthAvg":0.4746,"ascent":0.9688,"descent":0.2412,"lineGap":0},"axes":{"opsz":[14,14,32],"wght":[100,400,900]},"weightClass":400,"italic":false,"glyphCount":518},"licence":{"id":"OFL-1.1","licensor":"Rasmus Andersson","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/inter/","checked":"2026-11-08"}},"inter-tight":{"id":"inter-tight","family":"Inter Tight","shelf":"compact-sans","slots":["text","display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"inter-tight-latin-wght.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":44872},{"style":"italic","file":"inter-tight-latin-wght-italic.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":47912,"metrics":{"hhea":{"ascent":1984,"descent":-494,"lineGap":0},"typo":{"ascent":1984,"descent":-494,"lineGap":0},"win":{"ascent":2263,"descent":654},"capHeight":1490,"xHeight":1118,"xWidthAvg":876}}],"weights":{"kind":"variable","min":100,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":100,"max":900},"axes":{"wght":[100,400,900]},"metrics":{"names":{"family":"Inter Tight","fullName":"Inter Tight Regular","postscriptName":"InterTight-Regular"},"unitsPerEm":2048,"hhea":{"ascent":1984,"descent":-494,"lineGap":0},"typo":{"ascent":1984,"descent":-494,"lineGap":0},"win":{"ascent":2263,"descent":654},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":1490,"xHeight":1118,"xWidthAvg":875,"zeroAdvance":1184,"ratios":{"cap":0.7275,"x":0.5459,"xWidthAvg":0.4272,"ascent":0.9688,"descent":0.2412,"lineGap":0},"axes":{"wght":[100,400,900]},"weightClass":400,"italic":false,"glyphCount":482},"licence":{"id":"OFL-1.1","licensor":"Rasmus Andersson","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/intertight/","checked":"2026-11-08"}},"arimo":{"id":"arimo","family":"Arimo","shelf":"compact-sans","slots":["text","display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"arimo-latin-wght.woff2","weight":"400 700","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":20132},{"style":"italic","file":"arimo-latin-wght-italic.woff2","weight":"400 700","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":22352,"metrics":{"hhea":{"ascent":1854,"descent":-434,"lineGap":67},"typo":{"ascent":1854,"descent":-434,"lineGap":67},"win":{"ascent":2136,"descent":797},"capHeight":1409,"xHeight":1082,"xWidthAvg":905}}],"weights":{"kind":"variable","min":400,"max":700,"available":[400,500,600,700]},"italics":{"kind":"variable","min":400,"max":700},"axes":{"wght":[400,400,700]},"metrics":{"names":{"family":"Arimo","fullName":"Arimo Regular","postscriptName":"Arimo-Regular"},"unitsPerEm":2048,"hhea":{"ascent":1854,"descent":-434,"lineGap":67},"typo":{"ascent":1854,"descent":-434,"lineGap":67},"win":{"ascent":2136,"descent":797},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":1409,"xHeight":1082,"xWidthAvg":905,"zeroAdvance":1139,"ratios":{"cap":0.688,"x":0.5283,"xWidthAvg":0.4419,"ascent":0.9053,"descent":0.2119,"lineGap":0.0327},"axes":{"wght":[400,400,700]},"weightClass":400,"italic":false,"glyphCount":242},"licence":{"id":"OFL-1.1","licensor":"Steve Matteson","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/arimo/","checked":"2026-11-08"}},"archivo":{"id":"archivo","family":"Archivo","shelf":"compact-sans","slots":["text","display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"archivo-latin-wght.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":90104},{"style":"italic","file":"archivo-latin-wght-italic.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":101676,"metrics":{"hhea":{"ascent":878,"descent":-210,"lineGap":0},"typo":{"ascent":878,"descent":-210,"lineGap":0},"win":{"ascent":1100,"descent":410},"capHeight":686,"xHeight":526,"xWidthAvg":453}}],"weights":{"kind":"variable","min":100,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":100,"max":900},"axes":{"wght":[100,600,900],"wdth":[62,100,125]},"metrics":{"names":{"family":"Archivo SemiBold","fullName":"Archivo SemiBold","postscriptName":"Archivo-SemiBold"},"unitsPerEm":1000,"hhea":{"ascent":878,"descent":-210,"lineGap":0},"typo":{"ascent":878,"descent":-210,"lineGap":0},"win":{"ascent":1100,"descent":410},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":686,"xHeight":526,"xWidthAvg":451,"zeroAdvance":575,"ratios":{"cap":0.686,"x":0.526,"xWidthAvg":0.451,"ascent":0.878,"descent":0.21,"lineGap":0},"axes":{"wght":[100,600,900],"wdth":[62,100,125]},"weightClass":600,"italic":false,"glyphCount":302},"licence":{"id":"OFL-1.1","licensor":"Omnibus-Type","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/archivo/","checked":"2026-11-08"}},"schibsted-grotesk":{"id":"schibsted-grotesk","family":"Schibsted Grotesk","shelf":"compact-sans","slots":["text","display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"schibsted-grotesk-latin-wght.woff2","weight":"400 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":46752},{"style":"italic","file":"schibsted-grotesk-latin-wght-italic.woff2","weight":"400 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":50300,"metrics":{"hhea":{"ascent":2000,"descent":-528,"lineGap":0},"typo":{"ascent":2000,"descent":-528,"lineGap":0},"win":{"ascent":2502,"descent":568},"capHeight":1440,"xHeight":1080,"xWidthAvg":927}}],"weights":{"kind":"variable","min":400,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":400,"max":900},"axes":{"wght":[400,400,900]},"metrics":{"names":{"family":"Schibsted Grotesk","fullName":"Schibsted Grotesk Regular","postscriptName":"SchibstedGrotesk-Regular"},"unitsPerEm":2048,"hhea":{"ascent":2000,"descent":-528,"lineGap":0},"typo":{"ascent":2000,"descent":-528,"lineGap":0},"win":{"ascent":2502,"descent":568},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":1440,"xHeight":1080,"xWidthAvg":950,"zeroAdvance":1252,"ratios":{"cap":0.7031,"x":0.5273,"xWidthAvg":0.4639,"ascent":0.9766,"descent":0.2578,"lineGap":0},"axes":{"wght":[400,400,900]},"weightClass":400,"italic":false,"glyphCount":287},"licence":{"id":"OFL-1.1","licensor":"Bakken & Bæck, Henrik Kongsvoll","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/schibstedgrotesk/","checked":"2026-11-08"}},"instrument-sans":{"id":"instrument-sans","family":"Instrument Sans","shelf":"compact-sans","slots":["text","display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"instrument-sans-latin-wght.woff2","weight":"400 700","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":57332},{"style":"italic","file":"instrument-sans-latin-wght-italic.woff2","weight":"400 700","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":61636,"metrics":{"hhea":{"ascent":970,"descent":-250,"lineGap":0},"typo":{"ascent":970,"descent":-250,"lineGap":0},"win":{"ascent":986,"descent":350},"capHeight":720,"xHeight":510,"xWidthAvg":454}}],"weights":{"kind":"variable","min":400,"max":700,"available":[400,500,600,700]},"italics":{"kind":"variable","min":400,"max":700},"axes":{"wdth":[75,100,100],"wght":[400,400,700]},"metrics":{"names":{"family":"Instrument Sans","fullName":"Instrument Sans Regular","postscriptName":"InstrumentSans-Regular"},"unitsPerEm":1000,"hhea":{"ascent":970,"descent":-250,"lineGap":0},"typo":{"ascent":970,"descent":-250,"lineGap":0},"win":{"ascent":986,"descent":350},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":720,"xHeight":510,"xWidthAvg":454,"zeroAdvance":666,"ratios":{"cap":0.72,"x":0.51,"xWidthAvg":0.454,"ascent":0.97,"descent":0.25,"lineGap":0},"axes":{"wdth":[75,100,100],"wght":[400,400,700]},"weightClass":400,"italic":false,"glyphCount":244},"licence":{"id":"OFL-1.1","licensor":"Rodrigo Fuenzalida, Jordan Egstad","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentsans/","checked":"2026-11-08"}},"geist":{"id":"geist","family":"Geist","shelf":"compact-sans","slots":["text","display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"geist-latin-wght.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":29400},{"style":"italic","file":"geist-latin-wght-italic.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":31008,"metrics":{"hhea":{"ascent":1005,"descent":-295,"lineGap":0},"typo":{"ascent":1005,"descent":-295,"lineGap":0},"win":{"ascent":1088,"descent":262},"capHeight":710,"xHeight":530,"xWidthAvg":459}}],"weights":{"kind":"variable","min":100,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":100,"max":900},"axes":{"wght":[100,400,900]},"metrics":{"names":{"family":"Geist","fullName":"Geist Regular","postscriptName":"Geist-Regular"},"unitsPerEm":1000,"hhea":{"ascent":1005,"descent":-295,"lineGap":0},"typo":{"ascent":1005,"descent":-295,"lineGap":0},"win":{"ascent":1088,"descent":262},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":710,"xHeight":530,"xWidthAvg":467,"zeroAdvance":663,"ratios":{"cap":0.71,"x":0.53,"xWidthAvg":0.467,"ascent":1.005,"descent":0.295,"lineGap":0},"axes":{"wght":[100,400,900]},"weightClass":400,"italic":false,"glyphCount":288},"licence":{"id":"OFL-1.1","licensor":"Andrés Briganti, Mateo Zaragoza, Guillermo Rauch, Evil Rabbit, José Rago, Facundo Santana","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/geist/","checked":"2026-11-08"}},"mona-sans":{"id":"mona-sans","family":"Mona Sans","shelf":"compact-sans","slots":["text","display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"mona-sans-latin-wght.woff2","weight":"200 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":98124},{"style":"italic","file":"mona-sans-latin-wght-italic.woff2","weight":"200 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":104780,"metrics":{"hhea":{"ascent":1090,"descent":-320,"lineGap":0},"typo":{"ascent":1090,"descent":-320,"lineGap":0},"win":{"ascent":1090,"descent":320},"capHeight":729,"xHeight":517,"xWidthAvg":446}}],"weights":{"kind":"variable","min":200,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":200,"max":900},"axes":{"wdth":[75,100,125],"wght":[200,200,900]},"metrics":{"names":{"family":"Mona Sans ExtraLight","fullName":"Mona Sans ExtraLight","postscriptName":"MonaSans-ExtraLight"},"unitsPerEm":1000,"hhea":{"ascent":1090,"descent":-320,"lineGap":0},"typo":{"ascent":1090,"descent":-320,"lineGap":0},"win":{"ascent":1090,"descent":320},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":729,"xHeight":517,"xWidthAvg":453,"zeroAdvance":612,"ratios":{"cap":0.729,"x":0.517,"xWidthAvg":0.453,"ascent":1.09,"descent":0.32,"lineGap":0},"axes":{"wdth":[75,100,125],"wght":[200,200,900]},"weightClass":200,"italic":false,"glyphCount":276},"licence":{"id":"OFL-1.1","licensor":"Tobias Bjerrome Ahlin, GitHub, Degarism Studio, Sebastian Carewe","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":true},"reserved_font_name":"Mona Sans","term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/monasans/","checked":"2026-11-08"}},"public-sans":{"id":"public-sans","family":"Public Sans","shelf":"text","slots":["text","display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"public-sans-latin-wght.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":26832},{"style":"italic","file":"public-sans-latin-wght-italic.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":28292,"metrics":{"hhea":{"ascent":1900,"descent":-450,"lineGap":0},"typo":{"ascent":1900,"descent":-450,"lineGap":0},"win":{"ascent":2315,"descent":495},"capHeight":1446,"xHeight":1034,"xWidthAvg":866}}],"weights":{"kind":"variable","min":100,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":100,"max":900},"axes":{"wght":[100,100,900]},"metrics":{"names":{"family":"Public Sans Thin","fullName":"Public Sans Thin","postscriptName":"PublicSans-Thin"},"unitsPerEm":2000,"hhea":{"ascent":1900,"descent":-450,"lineGap":0},"typo":{"ascent":1900,"descent":-450,"lineGap":0},"win":{"ascent":2315,"descent":495},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":1446,"xHeight":1034,"xWidthAvg":910,"zeroAdvance":1158,"ratios":{"cap":0.723,"x":0.517,"xWidthAvg":0.455,"ascent":0.95,"descent":0.225,"lineGap":0},"axes":{"wght":[100,100,900]},"weightClass":100,"italic":false,"glyphCount":278},"licence":{"id":"OFL-1.1","licensor":"USWDS, Dan Williams, Pablo Impallari, Rodrigo Fuenzalida","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/publicsans/","checked":"2026-11-08"}},"source-sans-3":{"id":"source-sans-3","family":"Source Sans 3","shelf":"text","slots":["text","display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"source-sans-3-latin-wght.woff2","weight":"200 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":28872},{"style":"italic","file":"source-sans-3-latin-wght-italic.woff2","weight":"200 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":28460,"metrics":{"hhea":{"ascent":1024,"descent":-400,"lineGap":0},"typo":{"ascent":1024,"descent":-400,"lineGap":0},"win":{"ascent":934,"descent":288},"capHeight":660,"xHeight":478,"xWidthAvg":390}}],"weights":{"kind":"variable","min":200,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":200,"max":900},"axes":{"wght":[200,200,900]},"metrics":{"names":{"family":"Source Sans 3 ExtraLight","fullName":"Source Sans 3","postscriptName":"SourceSans3-Roman"},"unitsPerEm":1000,"hhea":{"ascent":1024,"descent":-400,"lineGap":0},"typo":{"ascent":1024,"descent":-400,"lineGap":0},"win":{"ascent":934,"descent":288},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":660,"xHeight":478,"xWidthAvg":397,"zeroAdvance":472,"ratios":{"cap":0.66,"x":0.478,"xWidthAvg":0.397,"ascent":1.024,"descent":0.4,"lineGap":0},"axes":{"wght":[200,200,900]},"weightClass":200,"italic":false,"glyphCount":324},"licence":{"id":"OFL-1.1","licensor":"Paul D. Hunt","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":true},"reserved_font_name":"Source Sans 3","term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/sourcesans3/","checked":"2026-11-08"}},"libre-franklin":{"id":"libre-franklin","family":"Libre Franklin","shelf":"text","slots":["text","display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"libre-franklin-latin-wght.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":29292},{"style":"italic","file":"libre-franklin-latin-wght-italic.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":32856,"metrics":{"hhea":{"ascent":966,"descent":-246,"lineGap":0},"typo":{"ascent":966,"descent":-246,"lineGap":0},"win":{"ascent":1177,"descent":246},"capHeight":742,"xHeight":530,"xWidthAvg":453}}],"weights":{"kind":"variable","min":100,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":100,"max":900},"axes":{"wght":[100,100,900]},"metrics":{"names":{"family":"Libre Franklin Thin","fullName":"Libre Franklin Thin","postscriptName":"LibreFranklin-Thin"},"unitsPerEm":1000,"hhea":{"ascent":966,"descent":-246,"lineGap":0},"typo":{"ascent":966,"descent":-246,"lineGap":0},"win":{"ascent":1177,"descent":246},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":742,"xHeight":530,"xWidthAvg":453,"zeroAdvance":675,"ratios":{"cap":0.742,"x":0.53,"xWidthAvg":0.453,"ascent":0.966,"descent":0.246,"lineGap":0},"axes":{"wght":[100,100,900]},"weightClass":100,"italic":false,"glyphCount":262},"licence":{"id":"OFL-1.1","licensor":"Impallari Type","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/librefranklin/","checked":"2026-11-08"}},"manrope":{"id":"manrope","family":"Manrope","shelf":"text","slots":["text","display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"manrope-latin-wght.woff2","weight":"200 800","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":24532}],"weights":{"kind":"variable","min":200,"max":800,"available":[400,500,600,700,800]},"italics":{"kind":"none","available":[]},"axes":{"wght":[200,200,800]},"metrics":{"names":{"family":"Manrope ExtraLight","fullName":"Manrope ExtraLight","postscriptName":"Manrope-ExtraLight"},"unitsPerEm":2000,"hhea":{"ascent":2132,"descent":-600,"lineGap":0},"typo":{"ascent":2132,"descent":-600,"lineGap":0},"win":{"ascent":2132,"descent":600},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":1440,"xHeight":1080,"xWidthAvg":885,"zeroAdvance":1156,"ratios":{"cap":0.72,"x":0.54,"xWidthAvg":0.4425,"ascent":1.066,"descent":0.3,"lineGap":0},"axes":{"wght":[200,200,800]},"weightClass":200,"italic":false,"glyphCount":282},"licence":{"id":"OFL-1.1","licensor":"Mikhail Sharanda","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/","checked":"2026-11-08"}},"atkinson-hyperlegible-next":{"id":"atkinson-hyperlegible-next","family":"Atkinson Hyperlegible Next","shelf":"text","slots":["text","display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"atkinson-hyperlegible-next-latin-wght.woff2","weight":"200 800","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":33996},{"style":"italic","file":"atkinson-hyperlegible-next-latin-wght-italic.woff2","weight":"200 800","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":37644,"metrics":{"hhea":{"ascent":984,"descent":-316,"lineGap":0},"typo":{"ascent":984,"descent":-316,"lineGap":0},"win":{"ascent":996,"descent":411},"capHeight":668,"xHeight":496,"xWidthAvg":442}}],"weights":{"kind":"variable","min":200,"max":800,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":200,"max":800},"axes":{"wght":[200,400,800]},"metrics":{"names":{"family":"Atkinson Hyperlegible Next","fullName":"Atkinson Hyperlegible Next Regular","postscriptName":"AtkinsonHyperlegibleNext-Regular"},"unitsPerEm":1000,"hhea":{"ascent":984,"descent":-316,"lineGap":0},"typo":{"ascent":984,"descent":-316,"lineGap":0},"win":{"ascent":996,"descent":411},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":668,"xHeight":496,"xWidthAvg":442,"zeroAdvance":648,"ratios":{"cap":0.668,"x":0.496,"xWidthAvg":0.442,"ascent":0.984,"descent":0.316,"lineGap":0},"axes":{"wght":[200,400,800]},"weightClass":400,"italic":false,"glyphCount":247},"licence":{"id":"OFL-1.1","licensor":"Braille Institute, Applied Design Works, Elliott Scott, Megan Eiswerth, Letters From Sweden","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/atkinsonhyperlegiblenext/","checked":"2026-11-08"}},"source-serif-4":{"id":"source-serif-4","family":"Source Serif 4","shelf":"text","slots":["text","display"],"lucky":true,"category":"serif","fallback":"serif","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"source-serif-4-latin-wght.woff2","weight":"200 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":122360},{"style":"italic","file":"source-serif-4-latin-wght-italic.woff2","weight":"200 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":130188,"metrics":{"hhea":{"ascent":1036,"descent":-335,"lineGap":0},"typo":{"ascent":1036,"descent":-335,"lineGap":0},"win":{"ascent":1009,"descent":324},"capHeight":670,"xHeight":475,"xWidthAvg":412}}],"weights":{"kind":"variable","min":200,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":200,"max":900},"axes":{"wght":[200,400,900],"opsz":[8,20,60]},"metrics":{"names":{"family":"Source Serif 4","fullName":"Source Serif 4 Regular","postscriptName":"SourceSerif4Roman-Regular"},"unitsPerEm":1000,"hhea":{"ascent":1036,"descent":-335,"lineGap":0},"typo":{"ascent":1036,"descent":-335,"lineGap":0},"win":{"ascent":1009,"descent":324},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":670,"xHeight":475,"xWidthAvg":447,"zeroAdvance":500,"ratios":{"cap":0.67,"x":0.475,"xWidthAvg":0.447,"ascent":1.036,"descent":0.335,"lineGap":0},"axes":{"wght":[200,400,900],"opsz":[8,20,60]},"weightClass":400,"italic":false,"glyphCount":331},"licence":{"id":"OFL-1.1","licensor":"Frank Grießhammer","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/sourceserif4/","checked":"2026-11-08"}},"eb-garamond":{"id":"eb-garamond","family":"EB Garamond","shelf":"display-classic","slots":["display"],"lucky":true,"category":"serif","fallback":"serif","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"eb-garamond-latin-wght.woff2","weight":"400 800","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":44336},{"style":"italic","file":"eb-garamond-latin-wght-italic.woff2","weight":"400 800","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":47940,"metrics":{"hhea":{"ascent":1007,"descent":-298,"lineGap":0},"typo":{"ascent":1007,"descent":-298,"lineGap":0},"win":{"ascent":1047,"descent":390},"capHeight":650,"xHeight":400,"xWidthAvg":366}}],"weights":{"kind":"variable","min":400,"max":800,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":400,"max":800},"axes":{"wght":[400,400,800]},"metrics":{"names":{"family":"EB Garamond","fullName":"EB Garamond Regular","postscriptName":"EBGaramond-Regular"},"unitsPerEm":1000,"hhea":{"ascent":1007,"descent":-298,"lineGap":0},"typo":{"ascent":1007,"descent":-298,"lineGap":0},"win":{"ascent":1047,"descent":390},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":650,"xHeight":400,"xWidthAvg":378,"zeroAdvance":480,"ratios":{"cap":0.65,"x":0.4,"xWidthAvg":0.378,"ascent":1.007,"descent":0.298,"lineGap":0},"axes":{"wght":[400,400,800]},"weightClass":400,"italic":false,"glyphCount":336},"licence":{"id":"OFL-1.1","licensor":"Georg Duffner, Octavio Pardo","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/ebgaramond/","checked":"2026-11-08"}},"cormorant-garamond":{"id":"cormorant-garamond","family":"Cormorant Garamond","shelf":"display-classic","slots":["display"],"lucky":true,"category":"serif","fallback":"serif","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"cormorant-garamond-latin-wght.woff2","weight":"300 700","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":37640},{"style":"italic","file":"cormorant-garamond-latin-wght-italic.woff2","weight":"300 700","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":39260,"metrics":{"hhea":{"ascent":924,"descent":-287,"lineGap":0},"typo":{"ascent":924,"descent":-287,"lineGap":0},"win":{"ascent":1097,"descent":283},"capHeight":625,"xHeight":386,"xWidthAvg":351}}],"weights":{"kind":"variable","min":300,"max":700,"available":[400,500,600,700]},"italics":{"kind":"variable","min":300,"max":700},"axes":{"wght":[300,300,700]},"metrics":{"names":{"family":"Cormorant Garamond Light","fullName":"Cormorant Garamond Light","postscriptName":"CormorantGaramond-Light"},"unitsPerEm":1000,"hhea":{"ascent":924,"descent":-287,"lineGap":0},"typo":{"ascent":924,"descent":-287,"lineGap":0},"win":{"ascent":1097,"descent":283},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":625,"xHeight":386,"xWidthAvg":388,"zeroAdvance":477,"ratios":{"cap":0.625,"x":0.386,"xWidthAvg":0.388,"ascent":0.924,"descent":0.287,"lineGap":0},"axes":{"wght":[300,300,700]},"weightClass":300,"italic":false,"glyphCount":373},"licence":{"id":"OFL-1.1","licensor":"Christian Thalmann","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/","checked":"2026-11-08"}},"libre-baskerville":{"id":"libre-baskerville","family":"Libre Baskerville","shelf":"display-classic","slots":["display"],"lucky":true,"category":"serif","fallback":"serif","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"libre-baskerville-latin-wght.woff2","weight":"400 700","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":33872},{"style":"italic","file":"libre-baskerville-latin-wght-italic.woff2","weight":"400 700","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":31244,"metrics":{"hhea":{"ascent":970,"descent":-270,"lineGap":0},"typo":{"ascent":970,"descent":-270,"lineGap":0},"win":{"ascent":1182,"descent":270},"capHeight":770,"xHeight":530,"xWidthAvg":457}}],"weights":{"kind":"variable","min":400,"max":700,"available":[400,500,600,700]},"italics":{"kind":"variable","min":400,"max":700},"axes":{"wght":[400,400,700]},"metrics":{"names":{"family":"Libre Baskerville","fullName":"Libre Baskerville Regular","postscriptName":"LibreBaskerville-Regular"},"unitsPerEm":1000,"hhea":{"ascent":970,"descent":-270,"lineGap":0},"typo":{"ascent":970,"descent":-270,"lineGap":0},"win":{"ascent":1182,"descent":270},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":770,"xHeight":530,"xWidthAvg":513,"zeroAdvance":714,"ratios":{"cap":0.77,"x":0.53,"xWidthAvg":0.513,"ascent":0.97,"descent":0.27,"lineGap":0},"axes":{"wght":[400,400,700]},"weightClass":400,"italic":false,"glyphCount":270},"licence":{"id":"OFL-1.1","licensor":"Impallari Type","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":true},"reserved_font_name":"Libre Baskerville","term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/librebaskerville/","checked":"2026-11-08"}},"jost":{"id":"jost","family":"Jost","shelf":"display-classic","slots":["display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"jost-latin-wght.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":26576},{"style":"italic","file":"jost-latin-wght-italic.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":30700,"metrics":{"hhea":{"ascent":1070,"descent":-375,"lineGap":0},"typo":{"ascent":1070,"descent":-375,"lineGap":0},"win":{"ascent":1070,"descent":375},"capHeight":700,"xHeight":460,"xWidthAvg":419}}],"weights":{"kind":"variable","min":100,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":100,"max":900},"axes":{"wght":[100,400,900]},"metrics":{"names":{"family":"Jost","fullName":"Jost Regular","postscriptName":"Jost-Regular"},"unitsPerEm":1000,"hhea":{"ascent":1070,"descent":-375,"lineGap":0},"typo":{"ascent":1070,"descent":-375,"lineGap":0},"win":{"ascent":1070,"descent":375},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":700,"xHeight":460,"xWidthAvg":424,"zeroAdvance":600,"ratios":{"cap":0.7,"x":0.46,"xWidthAvg":0.424,"ascent":1.07,"descent":0.375,"lineGap":0},"axes":{"wght":[100,400,900]},"weightClass":400,"italic":false,"glyphCount":232},"licence":{"id":"OFL-1.1","licensor":"Owen Earl","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/jost/","checked":"2026-11-08"}},"newsreader":{"id":"newsreader","family":"Newsreader","shelf":"display-classic","slots":["display"],"lucky":true,"category":"serif","fallback":"serif","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"newsreader-latin-wght.woff2","weight":"200 800","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":132000},{"style":"italic","file":"newsreader-latin-wght-italic.woff2","weight":"200 800","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":146872,"metrics":{"hhea":{"ascent":1470,"descent":-530,"lineGap":0},"typo":{"ascent":1470,"descent":-530,"lineGap":0},"win":{"ascent":2326,"descent":531},"capHeight":1340,"xHeight":852,"xWidthAvg":740}}],"weights":{"kind":"variable","min":200,"max":800,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":200,"max":800},"axes":{"wght":[200,400,800],"opsz":[6,18,72]},"metrics":{"names":{"family":"Newsreader 16pt","fullName":"Newsreader 16pt Regular","postscriptName":"Newsreader16pt-Regular"},"unitsPerEm":2000,"hhea":{"ascent":1470,"descent":-530,"lineGap":0},"typo":{"ascent":1470,"descent":-530,"lineGap":0},"win":{"ascent":2326,"descent":531},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":1340,"xHeight":852,"xWidthAvg":805,"zeroAdvance":1100,"ratios":{"cap":0.67,"x":0.426,"xWidthAvg":0.4025,"ascent":0.735,"descent":0.265,"lineGap":0},"axes":{"wght":[200,400,800],"opsz":[6,18,72]},"weightClass":400,"italic":false,"glyphCount":262},"licence":{"id":"OFL-1.1","licensor":"Production Type","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/","checked":"2026-11-08"}},"fraunces":{"id":"fraunces","family":"Fraunces","shelf":"display-trendy","slots":["display"],"lucky":true,"category":"serif","fallback":"serif","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"fraunces-latin-wght.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":67304},{"style":"italic","file":"fraunces-latin-wght-italic.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":81520,"metrics":{"hhea":{"ascent":1956,"descent":-510,"lineGap":0},"typo":{"ascent":1956,"descent":-510,"lineGap":0},"win":{"ascent":2340,"descent":609},"capHeight":1400,"xHeight":940,"xWidthAvg":1012}}],"weights":{"kind":"variable","min":100,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":100,"max":900},"axes":{"opsz":[9,9,144],"wght":[100,900,900]},"metrics":{"names":{"family":"Fraunces","fullName":"Fraunces Regular","postscriptName":"Fraunces-Regular"},"unitsPerEm":2000,"hhea":{"ascent":1956,"descent":-510,"lineGap":0},"typo":{"ascent":1956,"descent":-510,"lineGap":0},"win":{"ascent":2340,"descent":609},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":1400,"xHeight":964,"xWidthAvg":1024,"zeroAdvance":1461,"ratios":{"cap":0.7,"x":0.482,"xWidthAvg":0.512,"ascent":0.978,"descent":0.255,"lineGap":0},"axes":{"opsz":[9,9,144],"wght":[100,900,900]},"weightClass":900,"italic":false,"glyphCount":245},"licence":{"id":"OFL-1.1","licensor":"Undercase Type, Phaedra Charles, Flavia Zimbardi","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/","checked":"2026-11-08"}},"bricolage-grotesque":{"id":"bricolage-grotesque","family":"Bricolage Grotesque","shelf":"display-trendy","slots":["display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"bricolage-grotesque-latin-wght.woff2","weight":"200 800","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":131548}],"weights":{"kind":"variable","min":200,"max":800,"available":[400,500,600,700,800]},"italics":{"kind":"none","available":[]},"axes":{"opsz":[12,96,96],"wght":[200,800,800],"wdth":[75,100,100]},"metrics":{"names":{"family":"Bricolage Grotesque 96pt ExtraBold","fullName":"Bricolage Grotesque 96pt ExtraBold","postscriptName":"BricolageGrotesque-96ptExtraBold"},"unitsPerEm":1000,"hhea":{"ascent":930,"descent":-270,"lineGap":0},"typo":{"ascent":930,"descent":-270,"lineGap":0},"win":{"ascent":1160,"descent":400},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":660,"xHeight":528,"xWidthAvg":446,"zeroAdvance":594,"ratios":{"cap":0.66,"x":0.528,"xWidthAvg":0.446,"ascent":0.93,"descent":0.27,"lineGap":0},"axes":{"opsz":[12,96,96],"wght":[200,800,800],"wdth":[75,100,100]},"weightClass":800,"italic":false,"glyphCount":268},"licence":{"id":"OFL-1.1","licensor":"Mathieu Triay","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/","checked":"2026-11-08"}},"syne":{"id":"syne","family":"Syne","shelf":"display-trendy","slots":["display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"syne-latin-wght.woff2","weight":"400 800","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":34608}],"weights":{"kind":"variable","min":400,"max":800,"available":[400,500,600,700,800]},"italics":{"kind":"none","available":[]},"axes":{"wght":[400,400,800]},"metrics":{"names":{"family":"Syne","fullName":"Syne Regular","postscriptName":"Syne-Regular"},"unitsPerEm":1000,"hhea":{"ascent":925,"descent":-275,"lineGap":0},"typo":{"ascent":925,"descent":-275,"lineGap":0},"win":{"ascent":955,"descent":495},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":650,"xHeight":500,"xWidthAvg":438,"zeroAdvance":588,"ratios":{"cap":0.65,"x":0.5,"xWidthAvg":0.438,"ascent":0.925,"descent":0.275,"lineGap":0},"axes":{"wght":[400,400,800]},"weightClass":400,"italic":false,"glyphCount":298},"licence":{"id":"OFL-1.1","licensor":"Bonjour Monde, Lucas Descroix, George Triantafyllakos","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/syne/","checked":"2026-11-08"}},"unbounded":{"id":"unbounded","family":"Unbounded","shelf":"display-trendy","slots":["display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"unbounded-latin-wght.woff2","weight":"200 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":50904}],"weights":{"kind":"variable","min":200,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"none","available":[]},"axes":{"wght":[200,400,900]},"metrics":{"names":{"family":"Unbounded","fullName":"Unbounded Regular","postscriptName":"Unbounded-Regular"},"unitsPerEm":1000,"hhea":{"ascent":995,"descent":-245,"lineGap":0},"typo":{"ascent":995,"descent":-245,"lineGap":0},"win":{"ascent":1262,"descent":286},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":750,"xHeight":566,"xWidthAvg":599,"zeroAdvance":893,"ratios":{"cap":0.75,"x":0.566,"xWidthAvg":0.599,"ascent":0.995,"descent":0.245,"lineGap":0},"axes":{"wght":[200,400,900]},"weightClass":400,"italic":false,"glyphCount":297},"licence":{"id":"OFL-1.1","licensor":"NaN","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/unbounded/","checked":"2026-11-08"}},"space-grotesk":{"id":"space-grotesk","family":"Space Grotesk","shelf":"display-trendy","slots":["display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"space-grotesk-latin-wght.woff2","weight":"300 700","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":22288}],"weights":{"kind":"variable","min":300,"max":700,"available":[400,500,600,700]},"italics":{"kind":"none","available":[]},"axes":{"wght":[300,300,700]},"metrics":{"names":{"family":"Space Grotesk Light","fullName":"Space Grotesk Light","postscriptName":"SpaceGrotesk-Light"},"unitsPerEm":1000,"hhea":{"ascent":984,"descent":-292,"lineGap":0},"typo":{"ascent":984,"descent":-292,"lineGap":0},"win":{"ascent":1150,"descent":292},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":700,"xHeight":486,"xWidthAvg":491,"zeroAdvance":638,"ratios":{"cap":0.7,"x":0.486,"xWidthAvg":0.491,"ascent":0.984,"descent":0.292,"lineGap":0},"axes":{"wght":[300,300,700]},"weightClass":300,"italic":false,"glyphCount":291},"licence":{"id":"OFL-1.1","licensor":"Florian Karsten","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/","checked":"2026-11-08"}},"big-shoulders":{"id":"big-shoulders","family":"Big Shoulders","shelf":"display-trendy","slots":["display"],"lucky":true,"category":"display","fallback":"sans","note":"Picked as 'Big Shoulders Display'; Google Fonts merged the Display and Text cuts into one 'Big Shoulders' family with an opsz axis.","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"big-shoulders-latin-wght.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":58436}],"weights":{"kind":"variable","min":100,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"none","available":[]},"axes":{"wght":[100,100,900],"opsz":[10,72,72]},"metrics":{"names":{"family":"Big Shoulders Thin","fullName":"Big Shoulders Thin","postscriptName":"BigShoulders-Thin"},"unitsPerEm":2000,"hhea":{"ascent":1971,"descent":-429,"lineGap":0},"typo":{"ascent":1971,"descent":-429,"lineGap":0},"win":{"ascent":2614,"descent":730},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":1600,"xHeight":1200,"xWidthAvg":485,"zeroAdvance":596,"ratios":{"cap":0.8,"x":0.6,"xWidthAvg":0.2425,"ascent":0.9855,"descent":0.2145,"lineGap":0},"axes":{"wght":[100,100,900],"opsz":[10,72,72]},"weightClass":100,"italic":false,"glyphCount":263},"licence":{"id":"OFL-1.1","licensor":"Patric King","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/bigshoulders/","checked":"2026-11-08"}},"young-serif":{"id":"young-serif","family":"Young Serif","shelf":"display-trendy","slots":["display"],"lucky":true,"category":"serif","fallback":"serif","provider":"google-fonts (self-hosted copy)","variable":false,"files":[{"style":"normal","file":"young-serif-latin-400.woff2","weight":"400","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":26992}],"weights":{"kind":"static","available":[400]},"italics":{"kind":"none","available":[]},"axes":{},"metrics":{"names":{"family":"Young Serif","fullName":"Young Serif Regular","postscriptName":"YoungSerif-Regular"},"unitsPerEm":1000,"hhea":{"ascent":1046,"descent":-366,"lineGap":0},"typo":{"ascent":1046,"descent":-366,"lineGap":0},"win":{"ascent":1302,"descent":366},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":750,"xHeight":500,"xWidthAvg":504,"zeroAdvance":602,"ratios":{"cap":0.75,"x":0.5,"xWidthAvg":0.504,"ascent":1.046,"descent":0.366,"lineGap":0},"axes":{},"weightClass":400,"italic":false,"glyphCount":294},"licence":{"id":"OFL-1.1","licensor":"Bastien Sozeau","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/youngserif/","checked":"2026-11-08"}},"anton":{"id":"anton","family":"Anton","shelf":"display-trendy","slots":["display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":false,"files":[{"style":"normal","file":"anton-latin-400.woff2","weight":"400","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":18612}],"weights":{"kind":"static","available":[400]},"italics":{"kind":"none","available":[]},"axes":{},"metrics":{"names":{"family":"Anton","fullName":"Anton Regular","postscriptName":"Anton-Regular"},"unitsPerEm":2048,"hhea":{"ascent":2409,"descent":-674,"lineGap":0},"typo":{"ascent":2409,"descent":-674,"lineGap":0},"win":{"ascent":2876,"descent":674},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":1760,"xHeight":1500,"xWidthAvg":834,"zeroAdvance":1012,"ratios":{"cap":0.8594,"x":0.7324,"xWidthAvg":0.4072,"ascent":1.1763,"descent":0.3291,"lineGap":0},"axes":{},"weightClass":400,"italic":false,"glyphCount":283},"licence":{"id":"OFL-1.1","licensor":"Vernon Adams","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/anton/","checked":"2026-11-08"}},"bebas-neue":{"id":"bebas-neue","family":"Bebas Neue","shelf":"display-trendy","slots":["display"],"lucky":true,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":false,"files":[{"style":"normal","file":"bebas-neue-latin-400.woff2","weight":"400","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":13768}],"weights":{"kind":"static","available":[400]},"italics":{"kind":"none","available":[]},"axes":{},"metrics":{"names":{"family":"Bebas Neue","fullName":"Bebas Neue Regular","postscriptName":"BebasNeue-Regular"},"unitsPerEm":1000,"hhea":{"ascent":900,"descent":-300,"lineGap":0},"typo":{"ascent":900,"descent":-300,"lineGap":0},"win":{"ascent":950,"descent":350},"useTypoMetrics":false,"metricTablesDisagree":false,"capHeight":700,"xHeight":700,"xWidthAvg":343,"zeroAdvance":400,"ratios":{"cap":0.7,"x":0.7,"xWidthAvg":0.343,"ascent":0.9,"descent":0.3,"lineGap":0},"axes":{},"weightClass":400,"italic":false,"glyphCount":269},"licence":{"id":"OFL-1.1","licensor":"Ryoichi Tsunekawa","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/bebasneue/","checked":"2026-11-08"}},"jetbrains-mono":{"id":"jetbrains-mono","family":"JetBrains Mono","shelf":"mono","slots":["mono"],"lucky":true,"category":"mono","fallback":"mono","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"jetbrains-mono-latin-wght.woff2","weight":"100 800","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":40404},{"style":"italic","file":"jetbrains-mono-latin-wght-italic.woff2","weight":"100 800","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":42964,"metrics":{"hhea":{"ascent":1020,"descent":-300,"lineGap":0},"typo":{"ascent":1020,"descent":-300,"lineGap":0},"win":{"ascent":1020,"descent":300},"capHeight":730,"xHeight":550,"xWidthAvg":600}}],"weights":{"kind":"variable","min":100,"max":800,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":100,"max":800},"axes":{"wght":[100,400,800]},"metrics":{"names":{"family":"JetBrains Mono","fullName":"JetBrains Mono Regular","postscriptName":"JetBrainsMono-Regular"},"unitsPerEm":1000,"hhea":{"ascent":1020,"descent":-300,"lineGap":0},"typo":{"ascent":1020,"descent":-300,"lineGap":0},"win":{"ascent":1020,"descent":300},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":730,"xHeight":550,"xWidthAvg":600,"zeroAdvance":600,"ratios":{"cap":0.73,"x":0.55,"xWidthAvg":0.6,"ascent":1.02,"descent":0.3,"lineGap":0},"axes":{"wght":[100,400,800]},"weightClass":400,"italic":false,"glyphCount":394},"licence":{"id":"OFL-1.1","licensor":"JetBrains, Philipp Nurullin, Konstantin Bulenkov","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/","checked":"2026-11-08"}},"ibm-plex-mono":{"id":"ibm-plex-mono","family":"IBM Plex Mono","shelf":"mono","slots":["mono"],"lucky":true,"category":"mono","fallback":"mono","provider":"google-fonts (self-hosted copy)","variable":false,"files":[{"style":"normal","file":"ibm-plex-mono-latin-400.woff2","weight":"400","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":14708},{"style":"normal","file":"ibm-plex-mono-latin-500.woff2","weight":"500","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":14888,"metrics":{"hhea":{"ascent":1025,"descent":-275,"lineGap":0},"typo":{"ascent":1025,"descent":-275,"lineGap":0},"win":{"ascent":1025,"descent":275},"capHeight":698,"xHeight":516,"xWidthAvg":600}},{"style":"normal","file":"ibm-plex-mono-latin-600.woff2","weight":"600","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":15620,"metrics":{"hhea":{"ascent":1025,"descent":-275,"lineGap":0},"typo":{"ascent":1025,"descent":-275,"lineGap":0},"win":{"ascent":1025,"descent":275},"capHeight":698,"xHeight":516,"xWidthAvg":600}},{"style":"normal","file":"ibm-plex-mono-latin-700.woff2","weight":"700","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":14908,"metrics":{"hhea":{"ascent":1025,"descent":-275,"lineGap":0},"typo":{"ascent":1025,"descent":-275,"lineGap":0},"win":{"ascent":1025,"descent":275},"capHeight":698,"xHeight":516,"xWidthAvg":600}},{"style":"italic","file":"ibm-plex-mono-latin-400-italic.woff2","weight":"400","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":16448,"metrics":{"hhea":{"ascent":1025,"descent":-275,"lineGap":0},"typo":{"ascent":1025,"descent":-275,"lineGap":0},"win":{"ascent":1025,"descent":275},"capHeight":698,"xHeight":516,"xWidthAvg":600}},{"style":"italic","file":"ibm-plex-mono-latin-500-italic.woff2","weight":"500","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":16484,"metrics":{"hhea":{"ascent":1025,"descent":-275,"lineGap":0},"typo":{"ascent":1025,"descent":-275,"lineGap":0},"win":{"ascent":1025,"descent":275},"capHeight":698,"xHeight":516,"xWidthAvg":600}},{"style":"italic","file":"ibm-plex-mono-latin-600-italic.woff2","weight":"600","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":17356,"metrics":{"hhea":{"ascent":1025,"descent":-275,"lineGap":0},"typo":{"ascent":1025,"descent":-275,"lineGap":0},"win":{"ascent":1025,"descent":275},"capHeight":698,"xHeight":516,"xWidthAvg":600}},{"style":"italic","file":"ibm-plex-mono-latin-700-italic.woff2","weight":"700","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":16540,"metrics":{"hhea":{"ascent":1025,"descent":-275,"lineGap":0},"typo":{"ascent":1025,"descent":-275,"lineGap":0},"win":{"ascent":1025,"descent":275},"capHeight":698,"xHeight":516,"xWidthAvg":600}}],"weights":{"kind":"static","available":[400,500,600,700]},"italics":{"kind":"static","available":[400,500,600,700]},"axes":{},"metrics":{"names":{"family":"IBM Plex Mono","fullName":"IBM Plex Mono Regular","postscriptName":"IBMPlexMono-Regular"},"unitsPerEm":1000,"hhea":{"ascent":1025,"descent":-275,"lineGap":0},"typo":{"ascent":1025,"descent":-275,"lineGap":0},"win":{"ascent":1025,"descent":275},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":698,"xHeight":516,"xWidthAvg":600,"zeroAdvance":600,"ratios":{"cap":0.698,"x":0.516,"xWidthAvg":0.6,"ascent":1.025,"descent":0.275,"lineGap":0},"axes":{},"weightClass":400,"italic":false,"glyphCount":280},"licence":{"id":"OFL-1.1","licensor":"Mike Abbink, Bold Monday","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":true},"reserved_font_name":"IBM Plex Mono","term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/","checked":"2026-11-08"}},"geist-mono":{"id":"geist-mono","family":"Geist Mono","shelf":"mono","slots":["mono"],"lucky":true,"category":"mono","fallback":"mono","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"geist-mono-latin-wght.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":23128},{"style":"italic","file":"geist-mono-latin-wght-italic.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":25516,"metrics":{"hhea":{"ascent":1005,"descent":-295,"lineGap":0},"typo":{"ascent":1005,"descent":-295,"lineGap":0},"win":{"ascent":1088,"descent":394},"capHeight":710,"xHeight":530,"xWidthAvg":600}}],"weights":{"kind":"variable","min":100,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":100,"max":900},"axes":{"wght":[100,400,900]},"metrics":{"names":{"family":"Geist Mono","fullName":"Geist Mono Regular","postscriptName":"GeistMono-Regular"},"unitsPerEm":1000,"hhea":{"ascent":1005,"descent":-295,"lineGap":0},"typo":{"ascent":1005,"descent":-295,"lineGap":0},"win":{"ascent":1088,"descent":394},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":710,"xHeight":530,"xWidthAvg":600,"zeroAdvance":600,"ratios":{"cap":0.71,"x":0.53,"xWidthAvg":0.6,"ascent":1.005,"descent":0.295,"lineGap":0},"axes":{"wght":[100,400,900]},"weightClass":400,"italic":false,"glyphCount":264},"licence":{"id":"OFL-1.1","licensor":"Andrés Briganti, Mateo Zaragoza, Guillermo Rauch, Evil Rabbit, José Rago, Facundo Santana","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/geistmono/","checked":"2026-11-08"}},"space-mono":{"id":"space-mono","family":"Space Mono","shelf":"mono","slots":["mono"],"lucky":true,"category":"mono","fallback":"mono","provider":"google-fonts (self-hosted copy)","variable":false,"files":[{"style":"normal","file":"space-mono-latin-400.woff2","weight":"400","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":16520},{"style":"normal","file":"space-mono-latin-700.woff2","weight":"700","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":16724,"metrics":{"hhea":{"ascent":1120,"descent":-361,"lineGap":0},"typo":{"ascent":1120,"descent":-361,"lineGap":0},"win":{"ascent":1120,"descent":361},"capHeight":700,"xHeight":496,"xWidthAvg":612}},{"style":"italic","file":"space-mono-latin-400-italic.woff2","weight":"400","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":18300,"metrics":{"hhea":{"ascent":1120,"descent":-361,"lineGap":0},"typo":{"ascent":1120,"descent":-361,"lineGap":0},"win":{"ascent":1120,"descent":361},"capHeight":700,"xHeight":496,"xWidthAvg":612}},{"style":"italic","file":"space-mono-latin-700-italic.woff2","weight":"700","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":18640,"metrics":{"hhea":{"ascent":1120,"descent":-361,"lineGap":0},"typo":{"ascent":1120,"descent":-361,"lineGap":0},"win":{"ascent":1120,"descent":361},"capHeight":700,"xHeight":496,"xWidthAvg":612}}],"weights":{"kind":"static","available":[400,700]},"italics":{"kind":"static","available":[400,700]},"axes":{},"metrics":{"names":{"family":"Space Mono","fullName":"Space Mono Regular","postscriptName":"SpaceMono-Regular"},"unitsPerEm":1000,"hhea":{"ascent":1120,"descent":-361,"lineGap":0},"typo":{"ascent":1120,"descent":-361,"lineGap":0},"win":{"ascent":1120,"descent":361},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":700,"xHeight":496,"xWidthAvg":612,"zeroAdvance":612,"ratios":{"cap":0.7,"x":0.496,"xWidthAvg":0.612,"ascent":1.12,"descent":0.361,"lineGap":0},"axes":{},"weightClass":400,"italic":false,"glyphCount":259},"licence":{"id":"OFL-1.1","licensor":"Colophon Foundry","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/spacemono/","checked":"2026-11-08"}},"hanken-grotesk":{"id":"hanken-grotesk","family":"Hanken Grotesk","shelf":"compact-sans","slots":["text","display"],"lucky":false,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"hanken-grotesk-latin-wght.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":34704},{"style":"italic","file":"hanken-grotesk-latin-wght-italic.woff2","weight":"100 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":35592,"metrics":{"hhea":{"ascent":1000,"descent":-303,"lineGap":0},"typo":{"ascent":1000,"descent":-303,"lineGap":0},"win":{"ascent":1000,"descent":303},"capHeight":697,"xHeight":493,"xWidthAvg":453}}],"weights":{"kind":"variable","min":100,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":100,"max":900},"axes":{"wght":[100,400,900]},"metrics":{"names":{"family":"Hanken Grotesk","fullName":"Hanken Grotesk Regular","postscriptName":"HankenGrotesk-Regular"},"unitsPerEm":1000,"hhea":{"ascent":1000,"descent":-303,"lineGap":0},"typo":{"ascent":1000,"descent":-303,"lineGap":0},"win":{"ascent":1000,"descent":303},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":697,"xHeight":493,"xWidthAvg":449,"zeroAdvance":560,"ratios":{"cap":0.697,"x":0.493,"xWidthAvg":0.449,"ascent":1,"descent":0.303,"lineGap":0},"axes":{"wght":[100,400,900]},"weightClass":400,"italic":false,"glyphCount":268},"licence":{"id":"OFL-1.1","licensor":"Alfredo Marco Pradil, Hanken Design Co.","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/hankengrotesk/","checked":"2026-11-08"}},"plus-jakarta-sans":{"id":"plus-jakarta-sans","family":"Plus Jakarta Sans","shelf":"compact-sans","slots":["text","display"],"lucky":false,"category":"sans","fallback":"sans","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"plus-jakarta-sans-latin-wght.woff2","weight":"200 800","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":27348},{"style":"italic","file":"plus-jakarta-sans-latin-wght-italic.woff2","weight":"200 800","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":29600,"metrics":{"hhea":{"ascent":1038,"descent":-222,"lineGap":0},"typo":{"ascent":1038,"descent":-222,"lineGap":0},"win":{"ascent":1296,"descent":356},"capHeight":745,"xHeight":536,"xWidthAvg":466}}],"weights":{"kind":"variable","min":200,"max":800,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":200,"max":800},"axes":{"wght":[200,400,800]},"metrics":{"names":{"family":"Plus Jakarta Sans","fullName":"Plus Jakarta Sans Regular","postscriptName":"PlusJakartaSans-Regular"},"unitsPerEm":1000,"hhea":{"ascent":1038,"descent":-222,"lineGap":0},"typo":{"ascent":1038,"descent":-222,"lineGap":0},"win":{"ascent":1296,"descent":356},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":745,"xHeight":536,"xWidthAvg":465,"zeroAdvance":732,"ratios":{"cap":0.745,"x":0.536,"xWidthAvg":0.465,"ascent":1.038,"descent":0.222,"lineGap":0},"axes":{"wght":[200,400,800]},"weightClass":400,"italic":false,"glyphCount":285},"licence":{"id":"OFL-1.1","licensor":"Tokotype","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/","checked":"2026-11-08"}},"playfair-display":{"id":"playfair-display","family":"Playfair Display","shelf":"display-classic","slots":["display"],"lucky":false,"category":"serif","fallback":"serif","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"playfair-display-latin-wght.woff2","weight":"400 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":38404},{"style":"italic","file":"playfair-display-latin-wght-italic.woff2","weight":"400 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":38804,"metrics":{"hhea":{"ascent":1082,"descent":-251,"lineGap":0},"typo":{"ascent":1082,"descent":-251,"lineGap":0},"win":{"ascent":1159,"descent":251},"capHeight":708,"xHeight":514,"xWidthAvg":423}}],"weights":{"kind":"variable","min":400,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"variable","min":400,"max":900},"axes":{"wght":[400,400,900]},"metrics":{"names":{"family":"Playfair Display","fullName":"Playfair Display Regular","postscriptName":"PlayfairDisplay-Regular"},"unitsPerEm":1000,"hhea":{"ascent":1082,"descent":-251,"lineGap":0},"typo":{"ascent":1082,"descent":-251,"lineGap":0},"win":{"ascent":1159,"descent":251},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":708,"xHeight":514,"xWidthAvg":450,"zeroAdvance":600,"ratios":{"cap":0.708,"x":0.514,"xWidthAvg":0.45,"ascent":1.082,"descent":0.251,"lineGap":0},"axes":{"wght":[400,400,900]},"weightClass":400,"italic":false,"glyphCount":318},"licence":{"id":"OFL-1.1","licensor":"Claus Eggers Sørensen","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":true},"reserved_font_name":"Playfair Display","term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/","checked":"2026-11-08"}},"cinzel":{"id":"cinzel","family":"Cinzel","shelf":"display-classic","slots":["display"],"lucky":false,"category":"serif","fallback":"serif","provider":"google-fonts (self-hosted copy)","variable":true,"files":[{"style":"normal","file":"cinzel-latin-wght.woff2","weight":"400 900","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":25904}],"weights":{"kind":"variable","min":400,"max":900,"available":[400,500,600,700,800]},"italics":{"kind":"none","available":[]},"axes":{"wght":[400,400,900]},"metrics":{"names":{"family":"Cinzel","fullName":"Cinzel Regular","postscriptName":"Cinzel-Regular"},"unitsPerEm":1000,"hhea":{"ascent":976,"descent":-372,"lineGap":0},"typo":{"ascent":976,"descent":-372,"lineGap":0},"win":{"ascent":976,"descent":372},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":700,"xHeight":500,"xWidthAvg":562,"zeroAdvance":596,"ratios":{"cap":0.7,"x":0.5,"xWidthAvg":0.562,"ascent":0.976,"descent":0.372,"lineGap":0},"axes":{"wght":[400,400,900]},"weightClass":400,"italic":false,"glyphCount":228},"licence":{"id":"OFL-1.1","licensor":"Natanael Gama","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/","checked":"2026-11-08"}},"instrument-serif":{"id":"instrument-serif","family":"Instrument Serif","shelf":"display-classic","slots":["display"],"lucky":false,"category":"serif","fallback":"serif","provider":"google-fonts (self-hosted copy)","variable":false,"files":[{"style":"normal","file":"instrument-serif-latin-400.woff2","weight":"400","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":21032},{"style":"italic","file":"instrument-serif-latin-400-italic.woff2","weight":"400","unicodeRange":"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD","bytes":22128,"metrics":{"hhea":{"ascent":990,"descent":-310,"lineGap":0},"typo":{"ascent":990,"descent":-310,"lineGap":0},"win":{"ascent":990,"descent":310},"capHeight":720,"xHeight":510,"xWidthAvg":356}}],"weights":{"kind":"static","available":[400]},"italics":{"kind":"static","available":[400]},"axes":{},"metrics":{"names":{"family":"Instrument Serif","fullName":"Instrument Serif Regular","postscriptName":"InstrumentSerif-Regular"},"unitsPerEm":1000,"hhea":{"ascent":990,"descent":-310,"lineGap":0},"typo":{"ascent":990,"descent":-310,"lineGap":0},"win":{"ascent":990,"descent":310},"useTypoMetrics":true,"metricTablesDisagree":false,"capHeight":720,"xHeight":510,"xWidthAvg":338,"zeroAdvance":460,"ratios":{"cap":0.72,"x":0.51,"xWidthAvg":0.338,"ascent":0.99,"descent":0.31,"lineGap":0},"axes":{},"weightClass":400,"italic":false,"glyphCount":220},"licence":{"id":"OFL-1.1","licensor":"Rodrigo Fuenzalida, Jordan Egstad","licensee":"n/a (open)","uses":["web","desktop","app"],"domains":"any","cap":null,"self_host":"allowed","modify":{"subset":true,"convert":true,"metric_override_css":"allowed","rename_required":false},"reserved_font_name":null,"term":{"type":"perpetual"},"proof":"https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentserif/","checked":"2026-11-08"}}},"systemFallbacks":{"sans":{"family":"Arial","local":["Arial","ArialMT"],"localItalic":["Arial Italic","Arial-ItalicMT"],"metrics":{"names":{"family":"Arial","fullName":"Arial","postscriptName":"ArialMT"},"unitsPerEm":2048,"hhea":{"ascent":1854,"descent":-434,"lineGap":67},"typo":{"ascent":1491,"descent":-431,"lineGap":307},"win":{"ascent":1854,"descent":434},"useTypoMetrics":false,"metricTablesDisagree":true,"capHeight":1467,"xHeight":1062,"xWidthAvg":905,"zeroAdvance":1139,"ratios":{"cap":0.7163,"x":0.5186,"xWidthAvg":0.4419,"ascent":0.9053,"descent":0.2119,"lineGap":0.0327},"axes":{},"weightClass":400,"italic":false,"glyphCount":4652},"measuredOn":"this machine (Windows 11)"},"serif":{"family":"Times New Roman","local":["Times New Roman","TimesNewRomanPSMT"],"localItalic":["Times New Roman Italic","TimesNewRomanPS-ItalicMT"],"metrics":{"names":{"family":"Times New Roman","fullName":"Times New Roman","postscriptName":"TimesNewRomanPSMT"},"unitsPerEm":2048,"hhea":{"ascent":1825,"descent":-443,"lineGap":87},"typo":{"ascent":1420,"descent":-442,"lineGap":307},"win":{"ascent":1825,"descent":443},"useTypoMetrics":false,"metricTablesDisagree":true,"capHeight":1356,"xHeight":916,"xWidthAvg":820,"zeroAdvance":1024,"ratios":{"cap":0.6621,"x":0.4473,"xWidthAvg":0.4004,"ascent":0.8911,"descent":0.2163,"lineGap":0.0425},"axes":{},"weightClass":400,"italic":false,"glyphCount":4732},"measuredOn":"this machine (Windows 11)"},"mono":{"family":"Courier New","local":["Courier New","CourierNewPSMT"],"localItalic":["Courier New Italic","CourierNewPS-ItalicMT"],"metrics":{"names":{"family":"Courier New","fullName":"Courier New","postscriptName":"CourierNewPSMT"},"unitsPerEm":2048,"hhea":{"ascent":1705,"descent":-615,"lineGap":0},"typo":{"ascent":1255,"descent":-386,"lineGap":0},"win":{"ascent":1705,"descent":615},"useTypoMetrics":false,"metricTablesDisagree":true,"capHeight":1170,"xHeight":866,"xWidthAvg":1229,"zeroAdvance":1229,"ratios":{"cap":0.5713,"x":0.4229,"xWidthAvg":0.6001,"ascent":0.8325,"descent":0.3003,"lineGap":0},"axes":{},"weightClass":400,"italic":false,"glyphCount":3767},"measuredOn":"this machine (Windows 11)"}}};
  root.FontdantLibrary = lib;
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
})(typeof window !== 'undefined' ? window : globalThis);

/* ── fontdant/src/fontface.js ── */
/* fontdant · font faces: the fit aliases and the metric-matched fallbacks
   For a look's three faces this emits the @font-face rules a page needs (proposal §5):
     1. one alias per font × slot, "<Family> fd-<slot>", with size-adjust = slot target ÷ (font metric ÷ UPM),
        so swapping the family keeps cap height (display slot) or x-height (text, mono) and, with the roles'
        explicit unitless leading, the line boxes;
     2. one metric-matched local() fallback per alias, "<Family> fd-<slot> fallback", the capsize / next/font
        method: size-adjust from average character width, then ascent/descent/line-gap overrides computed
        against the adjusted em, so the swap from fallback to web font does not jump (Chrome, Firefox; Safari
        ignores the three overrides until 27.4/28).
   A recipe's own fonts (Add a font: fontdant.fonts, scoped to that client) sit beside the library: use(fonts)
   registers them, and every function that takes a look registers look.fonts first. Their files carry a full
   `src` (a URL the project serves, or a data: URL) instead of a library path.
   Licence gate (proposal §5.8): a font whose licence forbids metric-override CSS gets no size-adjust (k = 1).
   Pure logic, no DOM. Plain script (window.FontdantFonts) or require()-able. Needs FontdantTokens and
   FontdantLibrary (dist/library.js) on the same root. */
(function (root) {
  'use strict';
  function T() { return root.FontdantTokens; }
  function L() { return root.FontdantLibrary; }
  var SLOTS = ['display', 'text', 'mono'];
  function pct(x) { return (Math.round(x * 10000) / 100) + '%'; }
  function q(s) { return '"' + String(s).replace(/"/g, '\\"') + '"'; }

  /* The target a slot normalises to: {metric, target}; a slot with matchFace borrows another slot's target. */
  function slotTarget(slot) {
    var f = T().faces[slot] && T().faces[slot].fit; if (!f) return null;
    if (f.matchFace) { var o = slotTarget(f.matchFace); return o ? { metric: o.metric, target: o.target, matchFace: f.matchFace } : null; }
    return { metric: f.metric, target: f.target };
  }
  function ratioFor(entry, metric) { var r = entry.metrics.ratios; return metric === 'cap-height' ? r.cap : r.x; }
  /* k: the size-adjust factor that puts this font's metric on the slot's target (1 = untouched). */
  function fitAllowed(entry) { var m = entry.licence && entry.licence.modify; return !(m && m.metric_override_css === 'forbidden'); }
  function fitFactor(entry, slot) { var t = slotTarget(slot); if (!t || !fitAllowed(entry)) return 1; var r = ratioFor(entry, t.metric); return r ? t.target / r : 1; }
  function aliasName(entry, slot) { return entry.family + ' fd-' + slot; }
  function facesOf(look) {
    var d = (L() && L().defaultLook) || {}, out = {};
    SLOTS.forEach(function (s) { out[s] = (look && look.faces && look.faces[s]) || d[s] || null; });
    return out;
  }
  var client = {};
  function use(fonts) { client = fonts && typeof fonts === 'object' ? fonts : {}; return api; }
  function clientFonts() { return client; }
  function entryOf(id) { return (L() && L().fonts && L().fonts[id]) || (id && client[id]) || null; }
  function isClient(id) { return !!(id && client[id] && !(L() && L().fonts && L().fonts[id])); }
  var FORMAT = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };
  function format(file) { var m = /\.(\w+)(\?|$)/.exec(file || ''); return FORMAT[m && m[1].toLowerCase()] || 'woff2'; }

  /* The font-family stack for a slot: alias, its fallback, the real family, the slot's generic stack. */
  function faceStack(fontId, slot) {
    var e = entryOf(fontId), generic = (T().faces[slot] && T().faces[slot].generic) || 'sans-serif';
    if (!e) return fontId ? q(fontId) + ', ' + generic : generic;
    // a font with no files (an Adobe Fonts kit) is loaded by its own name; the fallback only covers the wait
    if (!e.files || !e.files.length) return [q(e.family), q(aliasName(e, slot) + ' fallback')].join(', ') + ', ' + generic;
    return [q(aliasName(e, slot)), q(aliasName(e, slot) + ' fallback'), q(e.family)].join(', ') + ', ' + generic;
  }

  /* @font-face blocks for one font in one slot. opts: { baseUrl ('fonts'), display ('swap'|'optional'|'block') } */
  function faceBlocks(fontId, slot, opts) {
    opts = opts || {};
    var e = entryOf(fontId); if (!e) return { css: '', preloads: [], k: 1, alias: null };
    var base = (opts.baseUrl == null ? 'fonts' : opts.baseUrl).replace(/\/$/, '');
    var k = fitFactor(e, slot), alias = aliasName(e, slot);
    var display = opts.display || (T().faces[slot] && T().faces[slot].loading) || 'swap';
    var m = e.metrics, lines = [], preloads = [], hasItalic = false;
    e.files.forEach(function (f) {
      var italic = f.style === 'italic'; if (italic) hasItalic = true;
      var weight = e.weights.kind === 'variable' ? e.weights.min + ' ' + e.weights.max : f.weight;
      var url = f.src || base + '/' + e.id + '/' + f.file;
      if (!italic && !/^data:/.test(url)) preloads.push(url);   // italics load on demand; only the upright files are preloaded
      lines.push('@font-face {\n  font-family: ' + q(alias) + ';\n  src: url(' + q(url) + ') format("' + format(f.file || f.src) + '");\n  font-weight: ' + weight + ';\n  font-style: ' + (italic ? 'italic' : 'normal') + ';\n  font-display: ' + display + ';\n  size-adjust: ' + pct(k) + ';' + (f.unicodeRange ? '\n  unicode-range: ' + f.unicodeRange + ';' : '') + '\n}');
    });
    var fb = L().systemFallbacks && L().systemFallbacks[e.fallback];
    if (fb) {
      var fr = fb.metrics.ratios, s = k * (m.ratios.xWidthAvg / fr.xWidthAvg);   // width match, then the fit factor on top
      var overrides = '\n  size-adjust: ' + pct(s) + ';\n  ascent-override: ' + pct(k * m.ratios.ascent / s) + ';\n  descent-override: ' + pct(k * m.ratios.descent / s) + ';\n  line-gap-override: ' + pct(k * m.ratios.lineGap / s) + ';';
      lines.push('@font-face {\n  font-family: ' + q(alias + ' fallback') + ';\n  src: ' + fb.local.map(function (n) { return 'local(' + q(n) + ')'; }).join(', ') + ';\n  font-style: normal;' + overrides + '\n}');
      if (hasItalic && fb.localItalic && fb.localItalic.length) lines.push('@font-face {\n  font-family: ' + q(alias + ' fallback') + ';\n  src: ' + fb.localItalic.map(function (n) { return 'local(' + q(n) + ')'; }).join(', ') + ';\n  font-style: italic;' + overrides + '\n}');
    }
    return { css: lines.join('\n'), preloads: preloads, k: k, alias: alias, fallbackFactor: fb ? k * (m.ratios.xWidthAvg / fb.metrics.ratios.xWidthAvg) : null };
  }

  /* Everything a page needs for a look's faces: the @font-face css, the preload urls, and the --fd-face-* values. */
  function faceCss(look, opts) {
    if (look && look.fonts) use(look.fonts);
    var faces = facesOf(look), css = [], preloads = [], vars = {}, factors = {};
    SLOTS.forEach(function (slot) {
      var id = faces[slot]; if (!id) return;
      var b = faceBlocks(id, slot, opts);
      if (b.css) css.push('/* ' + slot + ': ' + id + ' (size-adjust ' + pct(b.k) + ') */\n' + b.css);
      preloads = preloads.concat(b.preloads); vars[slot] = faceStack(id, slot); factors[slot] = b.k;
    });
    // the same font in two slots gets two aliases with two factors; de-duplicate nothing, that is the point
    return { css: css.join('\n\n'), preloads: uniq(preloads), vars: vars, factors: factors };
  }
  function preloadTags(look, opts) {
    return faceCss(look, opts).preloads.map(function (u) { return '<link rel="preload" as="font" type="font/' + (format(u) === 'truetype' ? 'ttf' : format(u) === 'opentype' ? 'otf' : format(u)) + '" href="' + u + '" crossorigin>'; }).join('\n');
  }
  /* The adjusted metric ratio a font renders at in a slot (what T11/T12 compare). */
  function adjusted(fontId, slot) {
    var e = entryOf(fontId), t = slotTarget(slot); if (!e || !t) return null;
    var k = fitFactor(e, slot); return { cap: e.metrics.ratios.cap * k, x: e.metrics.ratios.x * k, k: k, metric: t.metric, target: t.target, raw: ratioFor(e, t.metric) };
  }
  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }

  var api = { SLOTS: SLOTS, slotTarget: slotTarget, fitFactor: fitFactor, aliasName: aliasName, faceStack: faceStack, faceBlocks: faceBlocks, faceCss: faceCss, preloadTags: preloadTags, adjusted: adjusted, facesOf: facesOf, entryOf: entryOf, use: use, clientFonts: clientFonts, isClient: isClient, fitAllowed: fitAllowed, format: format };
  root.FontdantFonts = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* ── fontdant/src/typecheck.js ── */
/* fontdant · type checks and the dial fit
   Resolves a look (the fontdant half of a recipe) against the token defaults, checks the contracts
   that need no font data (T1–T10, T15–T17), and fits dials to their floors and order the way
   WEYLD booth's validateAndFix() did. Pure logic, no DOM. Plain script (window.FontdantCheck) or
   require()-able. Contracts that need font metrics (T11, T12, T14) or a rendered page (T13) are
   reported as pending here and land in later phases. */
(function (root) {
  'use strict';

  var REM = 16;
  function tokens() { return root.FontdantTokens; }
  function lib() { return root.FontdantLibrary || null; }
  function fonts() { return root.FontdantFonts || null; }
  function facesOf(look) {
    var d = (lib() && lib().defaultLook) || {}, out = {};
    ['display', 'text', 'mono'].forEach(function (s) { out[s] = (look && look.faces && look.faces[s]) || d[s] || null; });
    return out;
  }
  // library fonts, plus the look's own fonts (Add a font) once FontdantFonts.use() has registered them
  function entryOf(id) { if (!id) return null; if (fonts()) return fonts().entryOf(id); return lib() && lib().fonts ? lib().fonts[id] || null : null; }
  function useFonts(look) { if (fonts() && look) fonts().use(look.fonts || {}); }
  function weightAvailable(entry, w) {
    if (!entry) return true;
    var a = entry.weights; return a.kind === 'variable' ? w >= a.min && w <= a.max : a.available.indexOf(w) >= 0;
  }
  function nearestWeight(entry, w) {
    var a = entry.weights; if (a.kind === 'variable') return Math.max(a.min, Math.min(a.max, w));
    return a.available.reduce(function (best, v) { return Math.abs(v - w) < Math.abs(best - w) ? v : best; }, a.available[0]);
  }
  function modes() { return Object.keys(tokens().modes); }
  function isModeMap(v) { return v && typeof v === 'object' && modes().some(function (m) { return m in v; }); }
  function forMode(v, mode) { return isModeMap(v) ? v[mode] : v; }
  function weightKeys() { return Object.keys(tokens().weights); }

  /* ── units ── */
  // px value of a size expression at a scaling factor. rem terms scale; clamp() resolves to its minimum
  // (the floors are checked where the text is smallest); vw terms are ignored inside clamp minima.
  function px(expr, scaling, basePx) {
    if (typeof expr === 'number') return expr;
    var s = String(expr).trim();
    var m;
    if ((m = /^clamp\(\s*([^,]+),/.exec(s))) return px(m[1], scaling, basePx);
    if ((m = /^calc\(\s*(\d*\.?\d+)rem\s*\*\s*var\(--[\w-]+-scaling\)\s*\)$/.exec(s))) return parseFloat(m[1]) * REM * scaling;
    if ((m = /^(\d*\.?\d+)rem$/.exec(s))) return parseFloat(m[1]) * REM * scaling;
    if ((m = /^(\d*\.?\d+)em$/.exec(s))) return parseFloat(m[1]) * (basePx || REM * scaling);
    if ((m = /^(\d*\.?\d+)px$/.exec(s))) return parseFloat(m[1]);
    return NaN;
  }
  function relativeUnit(expr) {
    var s = String(expr);
    if (/^\d*\.?\d+(rem|em)$/.test(s)) return true;
    if (/^clamp\(/.test(s)) return /\d*\.?\d+rem/.test(s);
    return false;
  }
  function emValue(tr) { var m = /^(-?\d*\.?\d+)em$/.exec(String(tr).trim()); return m ? parseFloat(m[1]) : (String(tr).trim() === '0' ? 0 : NaN); }
  function isEm(tr) { return String(tr).trim() === '0' || /^-?\d*\.?\d+em$/.test(String(tr).trim()); }

  /* ── resolve ──
     look: { mode, scaling, faces:{}, dials:{ steps:{}, weights:{} }, roles:{ name:{ field overrides } } }
     Returns every emitted style (role, role-step, role-variant) with px size, numeric weight, leading,
     tracking (em number), case, italic, plus the mode's step table in px. */
  function resolve(look) {
    var T = tokens(); look = look || {}; useFonts(look);
    var mode = look.mode || T.defaultMode, modeDef = T.modes[mode];
    if (!modeDef) throw new Error('unknown mode ' + mode);
    var scaling = look.scaling == null ? 1 : look.scaling;
    var steps = {}, dialSteps = (look.dials && look.dials.steps) || {};
    T.stepOrder.forEach(function (s) { steps[s] = dialSteps[s] != null ? dialSteps[s] : modeDef.steps[s]; });
    var weights = {}, dialW = (look.dials && look.dials.weights) || {};
    weightKeys().forEach(function (k) { weights[k] = dialW[k] != null ? dialW[k] : T.weights[k]; });
    var stepPx = {}; T.stepOrder.forEach(function (s) { stepPx[s] = px(steps[s], scaling); });
    var roleOver = look.roles || {};
    var bodyPx = null, styles = [];
    function one(role, over, name, kind) {
      var s = {}; Object.keys(role).forEach(function (k) { s[k] = role[k]; });
      Object.keys(over || {}).forEach(function (k) { s[k] = over[k]; });
      var o = roleOver[name] || (name === role.name ? null : null); if (o) Object.keys(o).forEach(function (k) { s[k] = o[k]; });
      var baseOver = roleOver[role.name]; if (baseOver && name !== role.name) Object.keys(baseOver).forEach(function (k) { if (!(k in (over || {})) && !(o && k in o)) s[k] = baseOver[k]; });
      var w = s.weight; if (over && over.strong) { var ks = weightKeys(); w = ks[Math.min(ks.indexOf(w) + 1, ks.length - 1)]; }
      var sizeExpr = forMode(s.size, mode), isStep = T.stepOrder.indexOf(sizeExpr) >= 0;
      var sizePx = isStep ? stepPx[sizeExpr] : px(sizeExpr, scaling, bodyPx || stepPx.md);
      var tr = forMode(s.tracking, mode);
      return { name: name, role: role.name, kind: kind, face: forMode(s.face, mode), step: isStep ? sizeExpr : null, sizeExpr: isStep ? steps[sizeExpr] : sizeExpr, sizePx: sizePx,
        weight: typeof w === 'number' ? w : weights[w], weightDial: typeof w === 'number' ? null : w, leading: forMode(s.leading, mode), tracking: tr, trackingEm: emValue(tr),
        tnum: !!s.tnum, case: s.case || 'none', italic: !!s.italic, measure: s.measure || null, align: s.align || null, coarseFloor: s.coarseFloor || null, fit: s.fit || null, loading: s.loading || null,
        color: s.color || null, against: s.against || null, extension: !!role.extension, base: role.base || null };
    }
    extensionRoles(look).forEach(function (role) { if (!T.roles.some(function (r) { return r.name === role.name; })) T = withRole(T, role); });
    T.roles.forEach(function (role) {
      var baseOver = (role.steps && role.defaultStep && role.steps[role.defaultStep]) || {}; // bare role = its default step
      var base = one(role, baseOver, role.name, 'role'); if (role.name === 'body') bodyPx = base.sizePx; styles.push(base);
      Object.keys(role.steps || {}).forEach(function (k) { styles.push(one(role, role.steps[k], role.name + '-' + k, 'step')); });
      Object.keys(role.variants || {}).forEach(function (k) { styles.push(one(role, role.variants[k], role.name + '-' + k, 'variant')); });
    });
    var faces = facesOf(look);
    styles.forEach(function (s) { s.faceId = faces[s.face] || null; });
    return { mode: mode, scaling: scaling, steps: steps, stepPx: stepPx, weights: weights, styles: styles, floors: modeDef.floors, faces: faces };
  }

  /* ── extensions ── a project registers extra roles (proposal §8) in look.extensions.roles, with the
     standard role schema ({ name, base, face, size, weight, leading, tracking, case, tnum, color }); base names
     the core role whose job it does (the pass reads its colour rules from it). They are
     resolved, emitted and checked like core roles; other projects never see them. An extension cannot
     replace a core role. */
  function extensionRoles(look) {
    var ext = look && look.extensions && look.extensions.roles;
    return Array.isArray(ext) ? ext.filter(function (r) { return r && typeof r.name === 'string' && /^[a-z][a-z0-9-]*$/.test(r.name); })
      .map(function (r) { var o = {}; Object.keys(r).forEach(function (k) { o[k] = r[k]; }); o.extension = true; if (o.leading == null) o.leading = 1.3; if (o.tracking == null) o.tracking = '0'; if (o.face == null) o.face = 'text'; return o; }) : [];
  }
  function withRole(T, role) { var t = Object.create(T); t.roles = T.roles.concat([role]); return t; }

  /* ── check ── returns [{id, label, level, ok, pending, detail}] in contract order. */
  /* opts.rendered: the result of a rendered run (kitchen's KitchenRender.measure) — fills T13. */
  function check(look, opts) {
    opts = opts || {};
    var T = tokens(), R = resolve(look), out = [];
    var byName = {}; R.styles.forEach(function (s) { byName[s.name] = s; });
    function add(c, ok, detail, level) { out.push({ id: c.id, label: c.label, level: level || c.level, ok: !!ok, pending: false, detail: detail || '' }); }
    var haveFonts = !!(lib() && fonts());
    T.contracts.forEach(function (c) {
      if (c.needs === 'render' && opts.rendered) { var rr = opts.rendered; out.push({ id: c.id, label: c.label, level: c.level, ok: !!rr.ok, pending: false, detail: rr.detail || '' }); return; }
      if (c.needs && !(c.needs === 'font-metrics' && haveFonts)) { out.push({ id: c.id, label: c.label, level: c.level, ok: true, pending: true, detail: 'needs ' + c.needs + ' (later phase)' }); return; }
      var bad = [];
      switch (c.id) {
        case 'T11': {   // every face is measured and sits on its slot target after the fit
          ['display', 'text', 'mono'].forEach(function (slot) {
            var id = R.faces[slot], e = entryOf(id);
            if (!e) { bad.push(slot + ': ' + (id || 'no face') + ' is not in the library (unmeasured, no fit)'); return; }
            var a = fonts().adjusted(id, slot); if (!a) return;
            var delta = Math.abs(a.raw - a.target) / a.target;
            if (delta > 0.10 && Math.abs(a.k - 1) < 1e-9) bad.push(slot + ': ' + id + ' ' + a.metric + ' ' + round(a.raw) + ' vs target ' + a.target + ' with no fit');
          });
          add(c, !bad.length, bad.length ? bad.join('; ') : ['display', 'text', 'mono'].map(function (slot) { var a = fonts().adjusted(R.faces[slot], slot); return a ? slot + ' ' + R.faces[slot] + ' ×' + round(a.k) : ''; }).join(', ')); break;
        }
        case 'T12': {   // mono's adjusted x-height within 5% of body's
          var am = fonts().adjusted(R.faces.mono, 'mono'), at = fonts().adjusted(R.faces.text, 'text');
          if (!am || !at) { add(c, false, 'unmeasured face'); break; }
          var d12 = Math.abs(am.x - at.x) / at.x;
          add(c, d12 <= 0.05, 'mono x ' + round(am.x) + ' vs body x ' + round(at.x) + ' (' + round(d12 * 100) + '%)'); break;
        }
        case 'T14': {   // every style's weight exists in its face
          R.styles.forEach(function (s) { var e = entryOf(s.faceId); if (e && !weightAvailable(e, s.weight)) bad.push(s.name + ' ' + s.weight + ' not in ' + s.faceId + ' (' + (e.weights.kind === 'variable' ? e.weights.min + '–' + e.weights.max : e.weights.available.join('/')) + ')'); });
          add(c, !bad.length, bad.join('; ')); break;
        }
        case 'T1':
          T.stepOrder.forEach(function (s) { if (!relativeUnit(R.steps[s])) bad.push('step ' + s + ' = ' + R.steps[s]); });
          R.styles.forEach(function (s) { if (!s.step && !relativeUnit(s.sizeExpr)) bad.push(s.name + ' = ' + s.sizeExpr); });
          add(c, !bad.length, bad.join('; ')); break;
        case 'T2':
          R.styles.forEach(function (s) { if (typeof s.leading !== 'number') bad.push(s.name + ' leading ' + s.leading); if (!isEm(s.tracking)) bad.push(s.name + ' tracking ' + s.tracking); });
          add(c, !bad.length, bad.join('; ')); break;
        case 'T3': { var b = byName[c.role]; add(c, b && b.leading >= c.min, b ? c.role + ' leading ' + b.leading : 'no body'); break; }
        case 'T4': {
          var m = byName[c.role], ch = m && m.measure ? parseFloat(m.measure) : NaN;
          if (!(ch <= c.max)) add(c, false, 'measure ' + (m && m.measure) + ' > ' + c.max + 'ch');
          else if (ch < c.warnBand[0] || ch > c.warnBand[1]) add(c, false, 'measure ' + ch + 'ch outside ' + c.warnBand.join('–') + 'ch', 'warn');
          else add(c, true, 'measure ' + ch + 'ch'); break;
        }
        case 'T5': {
          var fl = R.floors, minScale = (T.scalingRange && T.scalingRange[0]) || 1, k = minScale / R.scaling;
          R.styles.forEach(function (s) {
            if (s.step === null && !/rem/.test(String(s.sizeExpr))) return; // em-relative steps (mono-inline) float with their parent
            var at = s.sizePx * k, floor = fl[s.name] != null ? fl[s.name] : fl.any;
            if (at < floor - 1e-9) bad.push(s.name + ' ' + round(at) + 'px < ' + floor + 'px' + (k !== 1 ? ' at scaling ' + minScale : ''));
          });
          add(c, !bad.length, bad.join('; ')); break;
        }
        case 'T6': {
          for (var i = 1; i < T.stepOrder.length; i++) { var a = R.stepPx[T.stepOrder[i - 1]], bb = R.stepPx[T.stepOrder[i]]; if (!(bb > a)) bad.push(T.stepOrder[i - 1] + ' ' + round(a) + ' !< ' + T.stepOrder[i] + ' ' + round(bb)); }
          add(c, !bad.length, bad.join('; ')); break;
        }
        case 'T7': {
          var hard = [];
          R.styles.forEach(function (s) { if (s.sizePx < 24) { if (s.weight < 300) hard.push(s.name + ' ' + s.weight + ' @ ' + round(s.sizePx) + 'px'); else if (s.weight < 400) bad.push(s.name + ' ' + s.weight + ' @ ' + round(s.sizePx) + 'px'); } });
          if (hard.length) add(c, false, hard.join('; '), 'hard'); else add(c, !bad.length, bad.join('; '), 'warn'); break;
        }
        case 'T8':
          R.styles.forEach(function (s) { if (s.case === 'upper' && !(s.trackingEm >= 0.05)) bad.push(s.name + ' tracking ' + s.tracking); });
          add(c, !bad.length, bad.join('; ')); break;
        case 'T9':
          R.styles.forEach(function (s) { if (s.trackingEm < 0 && s.sizePx < 20) bad.push(s.name + ' ' + s.tracking + ' @ ' + round(s.sizePx) + 'px'); });
          add(c, !bad.length, bad.join('; ')); break;
        case 'T10':
          Object.keys(c.bands).forEach(function (roleName) {
            var band = c.bands[roleName];
            R.styles.filter(function (s) { return s.role === roleName; }).forEach(function (s) {
              if ((band[0] != null && s.leading < band[0]) || (band[1] != null && s.leading > band[1])) bad.push(s.name + ' leading ' + s.leading + ' outside ' + band.join('–'));
            });
          });
          add(c, !bad.length, bad.join('; ')); break;
        case 'T15': {
          var v = byName[c.role + '-' + c.variant], fpx = v && v.coarseFloor ? px(v.coarseFloor, 1) : 0;
          add(c, fpx >= c.minPx, v ? c.role + '-' + c.variant + ' coarse floor ' + (v.coarseFloor || 'none') : 'no ' + c.role + '-' + c.variant); break;
        }
        case 'T16': { var bo = byName.body; add(c, !!bo, bo ? 'paragraph = ' + round(bo.leading * 1.5) + 'em, derived from leading ' + bo.leading : 'no body'); break; }
        case 'T17': { var bd = byName.body; var problems = []; if (bd && bd.align === 'justify') problems.push('justified'); if (bd && bd.italic) problems.push('italic'); if (bd && bd.case === 'upper') problems.push('uppercase'); add(c, !problems.length, problems.join(', ')); break; }
        default: add(c, true, 'no checker');
      }
    });
    return out;
  }
  function round(n) { return Math.round(n * 100) / 100; }
  function failures(look, opts) { return check(look, opts).filter(function (c) { return !c.ok && !c.pending; }); }

  /* ── fit ── the dial fit, after WEYLD's validateAndFix(): floors clamp, order bumps, scaling range clamps.
     Returns { look, notes } where notes are the badges to show. Never silently saves an undercut look. */
  function fit(look) {
    var T = tokens(); look = JSON.parse(JSON.stringify(look || {})); useFonts(look);
    var notes = [];
    var mode = look.mode || T.defaultMode, modeDef = T.modes[mode]; if (!modeDef) { look.mode = mode = T.defaultMode; modeDef = T.modes[mode]; notes.push('unknown mode; reset to ' + mode); }
    if (look.scaling != null && T.scalingRange) {
      var lo = T.scalingRange[0], hi = T.scalingRange[1];
      if (look.scaling < lo) { notes.push('scaling ' + look.scaling + ' raised to ' + lo); look.scaling = lo; }
      if (look.scaling > hi) { notes.push('scaling ' + look.scaling + ' lowered to ' + hi); look.scaling = hi; }
    }
    look.dials = look.dials || {}; look.dials.steps = look.dials.steps || {}; look.dials.weights = look.dials.weights || {};
    // weights: numeric, 100..900, in dial order
    var wk = weightKeys(), prevW = 0;
    wk.forEach(function (k) {
      var v = look.dials.weights[k] != null ? Number(look.dials.weights[k]) : T.weights[k];
      if (!(v >= 100 && v <= 900)) { notes.push('weight ' + k + ' ' + look.dials.weights[k] + ' reset to ' + T.weights[k]); v = T.weights[k]; }
      if (v < prevW) { notes.push('weight ' + k + ' raised to keep the order (' + prevW + ')'); v = prevW; }
      if (v !== T.weights[k]) look.dials.weights[k] = v; else delete look.dials.weights[k];
      prevW = v;
    });
    // steps: resolve to px, apply role floors, then order, then write back as rem (fluid defaults are left alone unless raised)
    var R = resolve(look), pxs = {}; T.stepOrder.forEach(function (s) { pxs[s] = R.stepPx[s]; });
    var needed = {}; // step -> highest floor any style on it demands
    R.styles.forEach(function (s) { if (!s.step) return; var f = R.floors[s.name] != null ? R.floors[s.name] : R.floors.any; if (needed[s.step] == null || f > needed[s.step]) needed[s.step] = f; });
    T.stepOrder.forEach(function (s) { var f = needed[s] != null ? needed[s] : R.floors.any; if (pxs[s] < f) { notes.push('step ' + s + ' raised to its floor (' + f + 'px)'); pxs[s] = f; } });
    for (var i = 1; i < T.stepOrder.length; i++) { var a = T.stepOrder[i - 1], b = T.stepOrder[i]; if (pxs[b] <= pxs[a]) { pxs[b] = pxs[a] + 1; notes.push('step ' + b + ' bumped to keep the order (' + pxs[b] + 'px)'); } }
    T.stepOrder.forEach(function (s) {
      var changed = Math.abs(pxs[s] - R.stepPx[s]) > 1e-9;
      if (changed) look.dials.steps[s] = (Math.round(pxs[s] / R.scaling / REM * 10000) / 10000) + 'rem';
      // an override that lands on the mode's default is no override
      if (look.dials.steps[s] != null && String(look.dials.steps[s]) === String(modeDef.steps[s])) delete look.dials.steps[s];
    });
    if (!Object.keys(look.dials.steps).length) delete look.dials.steps;
    if (!Object.keys(look.dials.weights).length) delete look.dials.weights;
    if (!Object.keys(look.dials).length) delete look.dials;
    // faces: unknown ids fall back to the default look; weights a face lacks snap to the nearest it has (badged);
    // a face whose hhea and typo tables disagree is flagged (F5)
    if (lib()) {
      var faces = facesOf(look), seen = {};
      ['display', 'text', 'mono'].forEach(function (slot) {
        var id = look.faces && look.faces[slot];
        if (id && !entryOf(id)) { notes.push(slot + ' face "' + id + '" is not in the library; using ' + (lib().defaultLook[slot] || 'the default')); delete look.faces[slot]; }
        var e = entryOf(faces[slot]);
        if (e && e.slots && e.slots.indexOf(slot) < 0) notes.push(faces[slot] + ' is not offered for the ' + slot + ' slot (' + e.slots.join('/') + ')');
        if (e && fonts() && !fonts().fitAllowed(e)) notes.push(e.id + ': its licence forbids metric-override CSS, so it is not fitted (size-adjust 100%)');
        if (e && e.metrics.metricTablesDisagree && !seen[e.id]) { seen[e.id] = 1; notes.push(e.id + ': hhea and typo metrics differ (' + e.metrics.hhea.ascent + '/' + e.metrics.typo.ascent + '); fit uses hhea'); }
      });
      if (look.faces && !Object.keys(look.faces).length) delete look.faces;
      var R2 = resolve(look);
      R2.styles.forEach(function (s) {
        var e = entryOf(s.faceId); if (!e || weightAvailable(e, s.weight)) return;
        var w = nearestWeight(e, s.weight);
        look.roles = look.roles || {}; look.roles[s.name] = look.roles[s.name] || {}; look.roles[s.name].weight = w;
        notes.push(s.name + ' weight ' + s.weight + ' snapped to ' + w + ' (' + e.id + ' has ' + (e.weights.kind === 'variable' ? e.weights.min + '–' + e.weights.max : e.weights.available.join('/')) + ')');
      });
    }
    return { look: look, notes: notes };
  }

  /* ── css ── the :root override block for a look, for before-first-paint injection or live preview. */
  function cssVars(look) {
    var T = tokens(), p = T.prefix, R = resolve(look), out = [];
    if (look && look.mode && look.mode !== T.defaultMode) out.push('/* mode: ' + look.mode + ' — set data-' + p + '-mode="' + look.mode + '" on <html> */');
    if (look && look.scaling != null && look.scaling !== 1) out.push('--' + p + '-scaling: ' + look.scaling + ';');
    Object.keys((look && look.faces) || {}).forEach(function (f) { out.push('--' + p + '-face-' + f + ': ' + (fonts() ? fonts().faceStack(look.faces[f], f) : look.faces[f]) + ';'); });
    Object.keys((look && look.dials && look.dials.steps) || {}).forEach(function (s) { out.push('--' + p + '-step-' + s + ': ' + String(R.steps[s]).replace(/(\d*\.?\d+)rem/g, 'calc($1rem * var(--' + p + '-scaling))') + ';'); });
    Object.keys((look && look.dials && look.dials.weights) || {}).forEach(function (w) { out.push('--' + p + '-weight-' + w + ': ' + R.weights[w] + ';'); });
    // per-role overrides (hand edits, and the weights fit snapped) → that style's longhand variables
    var mode = (look && look.mode) || T.defaultMode;
    Object.keys((look && look.roles) || {}).forEach(function (name) {
      var o = look.roles[name] || {}, v = function (k, val) { out.push('--' + p + '-' + name + '-' + k + ': ' + val + ';'); };
      var size = forMode(o.size, mode), tr = forMode(o.tracking, mode), lead = forMode(o.leading, mode);
      if (size != null) v('size', T.stepOrder.indexOf(size) >= 0 ? 'var(--' + p + '-step-' + size + ')' : String(size).replace(/(\d*\.?\d+)rem/g, 'calc($1rem * var(--' + p + '-scaling))'));
      if (o.weight != null) v('weight', typeof o.weight === 'number' ? o.weight : 'var(--' + p + '-weight-' + o.weight + ')');
      if (lead != null) v('leading', lead);
      if (tr != null) v('tracking', tr);
      if (o.case != null) v('transform', o.case === 'upper' ? 'uppercase' : o.case === 'lower' ? 'lowercase' : 'none');
      if (o.italic != null) v('style', o.italic ? 'italic' : 'normal');
      if (o.tnum != null) v('numeric', o.tnum ? 'tabular-nums' : 'normal');
    });
    return out.join('\n');
  }

  var api = { resolve: resolve, check: check, failures: failures, fit: fit, cssVars: cssVars, px: px };
  root.FontdantCheck = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* ── fontdant/src/emit.js ── */
/* fontdant · before-first-paint emission
   What a page needs in its first HTML bytes so a look renders with no flash and no jump (proposal §5.5):
   one preload per upright face file, the @font-face aliases and metric-matched fallbacks, the :root variables
   (faces, dials, role overrides) and the mode attribute for <html>. A server (a Worker's HTMLRewriter, a
   build step, pywebview's served page) writes these; the panel uses the same output for live preview.
   head(look, { baseUrl, id }) → { preloads, style, css, htmlAttrs, html }
   Plain script (window.FontdantEmit) or require()-able. Needs FontdantTokens, FontdantLibrary, FontdantFonts,
   FontdantCheck. */
(function (root) {
  'use strict';
  function css(look, opts) {
    look = look || {}; opts = opts || {};
    var T = root.FontdantTokens, p = T.prefix, F = root.FontdantFonts, C = root.FontdantCheck;
    if (look.fonts) F.use(look.fonts);
    var fc = F.faceCss(look, { baseUrl: opts.baseUrl });
    var vars = Object.keys(fc.vars).map(function (s) { return '--' + p + '-face-' + s + ': ' + fc.vars[s] + ';'; });
    var rest = C.cssVars(look).split('\n').filter(function (l) { return l && !/^\/\*/.test(l) && !/^--[\w-]+-face-/.test(l); });
    return { fonts: fc, text: fc.css + '\n:root {\n  ' + vars.concat(rest).join('\n  ') + '\n}' };
  }
  /* Adobe Fonts kits the look uses (provider adobe-kit): their stylesheet links, which may flash */
  function kits(look) {
    var F = root.FontdantFonts, out = []; if (look && look.fonts) F.use(look.fonts);
    var faces = F.facesOf(look || {}); Object.keys(faces).forEach(function (s) { var en = F.entryOf(faces[s]); if (en && en.kit) { var u = 'https://use.typekit.net/' + en.kit + '.css'; if (out.indexOf(u) < 0) out.push(u); } });
    return out;
  }
  function head(look, opts) {
    look = look || {}; opts = opts || {};
    var T = root.FontdantTokens, p = T.prefix, c = css(look, opts);
    var preloads = c.fonts.preloads.map(function (u) { return '<link rel="preload" as="font" type="font/' + (/\.woff2(\?|$)/.test(u) ? 'woff2' : /\.woff(\?|$)/.test(u) ? 'woff' : /\.otf(\?|$)/.test(u) ? 'otf' : 'ttf') + '" href="' + u + '" crossorigin>'; }).join('');
    preloads += kits(look).map(function (u) { return '<link rel="stylesheet" href="' + u + '">'; }).join('');
    var style = '<style id="' + (opts.id || 'fontdant') + '">' + c.text.replace(/<\/style/gi, '<\\/style') + '</style>';
    var attrs = {}; if (look.mode && look.mode !== T.defaultMode) attrs['data-' + p + '-mode'] = look.mode;
    return { preloads: preloads, style: style, css: c.text, htmlAttrs: attrs, html: preloads + style };
  }
  var api = { head: head, kits: kits, css: function (look, opts) { return css(look, opts).text; } };
  root.FontdantEmit = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* ── kitchen/src/recipe.js ── */
/* kitchen · recipe
   A recipe is a saved business profile: { name, scheme, client, frosting: { colors }, fontdant: { … } }.
   frosting's half is a look's colours; fontdant's half is a type look (mode, scaling, faces, dials, roles,
   styles, fonts) and may be empty. Validation follows frosting's one rule: unknown keys are dropped,
   missing ones fall back to defaults. Plain script (window.KitchenRecipe) or require()-able.
   createRecipeStore() keeps published / draft / favorite recipes through any KitchenStore adapter, under
   their own keys, so a project can hold its old frosting look and its recipes side by side. */
(function (root) {
  'use strict';
  var HEX = /^#[0-9a-fA-F]{6}$/;
  var SCHEMES = ['Light', 'Dark'];
  var FONTDANT_KEYS = ['mode', 'scaling', 'faces', 'dials', 'roles', 'styles', 'fonts'];
  var FACE_SLOTS = ['display', 'text', 'mono'];

  function str(v, max) { return typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max || 80) : ''; }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  /* frosting half: keep known roles with #RRGGBB (uppercased), fill the rest from defaults. */
  function cleanColors(colors, defaults) {
    var out = Object.assign({}, defaults || {});
    Object.keys(colors || {}).forEach(function (k) { if (k in out && HEX.test(String(colors[k]))) out[k] = String(colors[k]).toUpperCase(); });
    return out;
  }

  /* fontdant half: may be empty. Keeps only the known keys with the right shapes. Deeper validation
     (floors, weights a face has, fit) is fontdant's FontdantCheck.fit(), run by the pass, not here. */
  function cleanFontdant(fd) {
    var out = {};
    if (!isObj(fd)) return out;
    var T = root.FontdantTokens;
    if (typeof fd.mode === 'string' && (!T || (T.modes && fd.mode in T.modes))) out.mode = fd.mode;
    if (typeof fd.scaling === 'number' && isFinite(fd.scaling)) out.scaling = fd.scaling;
    if (isObj(fd.faces)) {
      var faces = {}; FACE_SLOTS.concat(Object.keys(fd.faces)).forEach(function (s) { if (typeof fd.faces[s] === 'string' && fd.faces[s]) faces[s] = str(fd.faces[s], 80); });
      if (Object.keys(faces).length) out.faces = faces;
    }
    ['dials', 'roles', 'styles', 'fonts', 'extensions'].forEach(function (k) { if (isObj(fd[k]) && Object.keys(fd[k]).length) out[k] = JSON.parse(JSON.stringify(fd[k])); });
    return out;
  }

  /* defaults: { colors } — frosting's defaults for the viewer's scheme. */
  function clean(recipe, defaults) {
    recipe = isObj(recipe) ? recipe : {};
    defaults = defaults || {};
    var fr = isObj(recipe.frosting) ? recipe.frosting : {};
    var out = {
      name: str(recipe.name, 40) || 'Untitled recipe',
      scheme: SCHEMES.indexOf(recipe.scheme) >= 0 ? recipe.scheme : (defaults.scheme || 'Light'),
      client: str(recipe.client, 80) || null,
      frosting: { colors: cleanColors(fr.colors, defaults.colors) },
      fontdant: cleanFontdant(recipe.fontdant),
      sprinkles: recipe.sprinkles !== false,   // Sprinkles (J1): on unless turned off; Plain greys are computed, never stored
    };
    return out;
  }
  function empty(defaults) { return clean({}, defaults); }

  /* Bridges to frosting's own shapes. */
  function fromLook(look, defaults) {   // frosting look on disk: { name, scheme, colors }
    look = isObj(look) ? look : {};
    return clean({ name: look.name, scheme: look.scheme, frosting: { colors: look.colors } }, defaults);
  }
  function toLook(recipe) { return { name: recipe.name, scheme: recipe.scheme, colors: Object.assign({}, recipe.frosting.colors) }; }

  /* The recipe store. Keys default to recipe / recipe.draft / recipe.favorites. If no recipe is saved yet
     but the adapter holds a published frosting look under 'theme', load() starts from that look, so a
     project switching to recipes keeps its colours. */
  function createRecipeStore(adapter, defaults, opts) {
    var S = root.KitchenStore;
    opts = opts || {};
    var base = S.createStore(adapter, {
      defaults: empty(defaults), clean: function (r) { return clean(r, defaults); },
      favoriteName: 'Saved recipe', favoriteKey: 'recipe',
      keys: Object.assign({ theme: 'recipe', draft: 'recipe.draft', favorites: 'recipe.favorites' }, opts.keys),
    });
    var load = base.load;
    base.load = function () {
      return Promise.all([load(), adapter.get(base.keys.theme), adapter.get(opts.legacyKey || 'theme')]).then(function (r) {
        var loaded = r[0];
        if (!r[1] && r[2]) {   // no recipe yet; adopt the published frosting look
          var colors = S.parse(r[2], null);
          if (colors) { var adopted = clean({ name: 'Current look', frosting: { colors: colors } }, defaults); loaded.theme = adopted; loaded.draft = adopted; loaded.adoptedFrostingLook = true; }
        }
        return loaded;
      });
    };
    return base;
  }

  var api = { clean: clean, empty: empty, cleanColors: cleanColors, cleanFontdant: cleanFontdant, fromLook: fromLook, toLook: toLook, createRecipeStore: createRecipeStore, FONTDANT_KEYS: FONTDANT_KEYS, SCHEMES: SCHEMES };
  root.KitchenRecipe = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* ── kitchen/src/sprinkles.js ── */
/* kitchen · Sprinkles (decisions J1–J4)
   Sprinkles on (the default) shows a recipe's designed greys, which already pass AA 4.5:1. Sprinkles off,
   "Plain", darkens (on a dark scheme: lightens) each muted colour just enough to reach 7:1 on bg and surface,
   keeping its hue: frosting's lightness-only fit. Plain greys are always computed, never stored.
     1. the panel: toggle(el, …) puts the switch and a side-by-side compare on the shell's tab bar; the pass
        turns X4's 7:1 advice into an info note when a Plain version exists
     2. visitors with prefers-contrast: more get Plain automatically: css() emits the media block
     3. a project may add an on-page "High contrast" switch: contrastSwitch(el) + bootScript() (before paint)
   Plain script (window.KitchenSprinkles) or require()-able. Needs FrostingColor. */
(function (root) {
  'use strict';
  var TARGET = 7, GROUNDS = ['bg', 'surface'], ATTR = 'data-mise-contrast';
  function C() { return root.FrostingColor; }
  function hexOk(h) { return /^#[0-9a-fA-F]{6}$/.test(h || ''); }
  function mutedRoles(colors) { return Object.keys(colors || {}).filter(function (k) { return k === 'muted' || /(^|-)muted$/.test(k); }); }
  function worst(c, colors) { return Math.min.apply(null, GROUNDS.filter(function (g) { return hexOk(colors[g]); }).map(function (g) { return C().contrast(c, colors[g]); })); }

  /* plain(colors) → { colors, changes: { role: { from, to, before, after } }, available } */
  function plain(colors) {
    colors = colors || {};
    var out = Object.assign({}, colors), changes = {}, available = true;
    mutedRoles(colors).forEach(function (k) {
      var from = colors[k]; if (!hexOk(from)) return;
      var before = worst(from, colors);
      var rules = GROUNDS.filter(function (g) { return hexOk(colors[g]); }).map(function (g) { return [colors[g], TARGET]; });
      var to = before >= TARGET ? from : C().fit(from, rules);
      var after = worst(to, colors);
      if (after < TARGET - 1e-9) available = false;
      out[k] = to.toUpperCase();
      changes[k] = { from: from.toUpperCase(), to: to.toUpperCase(), before: Math.round(before * 100) / 100, after: Math.round(after * 100) / 100 };
    });
    return { colors: out, changes: changes, available: available && mutedRoles(colors).length > 0 };
  }
  /* the colours a recipe actually shows: Plain when sprinkles is off */
  function effective(recipe) {
    var colors = (recipe && recipe.frosting && recipe.frosting.colors) || {};
    return recipe && recipe.sprinkles === false ? plain(colors).colors : colors;
  }

  /* css(colors, { prefix }) → the Plain greys for prefers-contrast: more and for the on-page switch.
     [data-mise-contrast="normal"] on <html> opts a visitor back out of the media query. */
  function css(colors, opts) {
    opts = opts || {}; var p = opts.prefix || 'fr', P = plain(colors), decl = Object.keys(P.changes).filter(function (k) { return P.changes[k].to !== P.changes[k].from; })
      .map(function (k) { return '--' + p + '-' + k + ': ' + P.changes[k].to + ' !important;'; }).join(' ');   // !important: wins over a panel's inline preview
    if (!decl) return '';
    return '@media (prefers-contrast: more) { :root:not([' + ATTR + '="normal"]) { ' + decl + ' } }\n:root[' + ATTR + '="more"] { ' + decl + ' }';
  }

  /* ── the Sprinkles setting, with a draft (decision J5: it waits for Publish, like colours and type) ──
     store(adapter, { key }) → { load(), draft(), published(), set(bool), publish(), reset(), pending() }
     The switch writes the draft ('sprinkles.draft'); visitors see the published value ('sprinkles') once the
     project's Publish calls publish(). Both default to on. */
  function store(adapter, sopts) {
    var key = (sopts && sopts.key) || 'sprinkles', st = { draft: true, published: true };
    var parse = function (raw) { if (raw == null || raw === '') return null; try { return JSON.parse(raw) !== false; } catch (e) { return null; } };
    return {
      load: function () {
        return Promise.all([adapter.get(key), adapter.get(key + '.draft')]).then(function (r) {
          var pub = parse(r[0]), dr = parse(r[1]);
          st.published = pub !== false; st.draft = dr == null ? st.published : dr; return st.draft;
        });
      },
      draft: function () { return st.draft; },
      published: function () { return st.published; },
      pending: function () { return st.draft !== st.published; },
      set: function (on) { st.draft = on !== false; return adapter.set(key + '.draft', JSON.stringify(st.draft)); },
      publish: function () { var v = st.draft; return adapter.set(key, JSON.stringify(v)).then(function () { st.published = v; return v; }); },
      reset: function () { st.draft = st.published; return adapter.set(key + '.draft', JSON.stringify(st.draft)); },
    };
  }

  /* ── 1. the panel toggle ──
     toggle(el, { get() → bool, set(bool), colors() → designed colours, pending() → bool (optional: shows
     "Not published yet" while the switch differs from what visitors see) }) → { refresh() } */
  function toggle(el, opts) {
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    el.innerHTML = '<div class="mise-spr"><label class="mise-spr__switch"><input type="checkbox" role="switch" data-sprinkles> <span>Sprinkles</span></label>' +
      '<span class="mise-spr__pending" data-sprinkles-pending hidden>Not published yet</span>' +
      '<button type="button" class="mise-spr__cmp" data-sprinkles-compare aria-expanded="false">Compare</button>' +
      '<div class="mise-spr__pop" data-sprinkles-pop hidden></div></div>';
    var box = el.querySelector('[data-sprinkles]'), btn = el.querySelector('[data-sprinkles-compare]'), pop = el.querySelector('[data-sprinkles-pop]'), pend = el.querySelector('[data-sprinkles-pending]');
    function mini(title, colors, note) {
      return '<div class="mise-spr__mini" style="background:' + colors.bg + ';color:' + colors.text + ';border-color:' + (colors.border || colors.muted) + '">' +
        '<strong>' + esc(title) + '</strong><span class="mise-spr__ratio" style="color:' + colors.muted + '">' + esc(note) + '</span>' +
        '<p style="color:' + colors.muted + '">Updated 8 Nov · 3 people helped</p>' +
        '<p style="color:' + colors.muted + ';background:' + colors.surface + '">On a card: prices include tax</p></div>';
    }
    function refresh() {
      var on = opts.get() !== false, d = opts.colors(), P = plain(d), m = P.changes.muted;
      box.checked = on;
      pend.hidden = !(opts.pending && opts.pending());
      pop.innerHTML = '<p class="mise-spr__lede">' + (P.available ? 'Plain darkens each grey just enough to reach 7:1. Visitors who ask their system for more contrast get Plain automatically.' : 'No Plain version: this background can’t carry 7:1 greys.') + '</p>' +
        '<div class="mise-spr__pair">' + mini('Sprinkles' + (on ? ' (on)' : ''), d, m ? 'muted ' + m.from + ' · ' + m.before + ':1' : '') + mini('Plain' + (on ? '' : ' (on)'), P.colors, m ? 'muted ' + m.to + ' · ' + m.after + ':1' : '') + '</div>';
    }
    box.addEventListener('change', function () { Promise.resolve(opts.set(box.checked)).then(refresh, refresh); refresh(); });
    btn.addEventListener('click', function () { pop.hidden = !pop.hidden; btn.setAttribute('aria-expanded', String(!pop.hidden)); if (!pop.hidden) refresh(); });
    refresh();
    return { refresh: refresh };
  }

  /* ── 3. the on-page High contrast switch ──
     contrastSwitch(el, { key, label }) → a button that sets data-mise-contrast on <html> and remembers it per
     visitor (localStorage, guarded). bootScript(key) is the inline snippet that restores it before paint. */
  function bootScript(key) {
    key = key || 'mise.contrast';
    return '<script>try{var c=localStorage.getItem(' + JSON.stringify(key) + ');if(c==="more"||c==="normal")document.documentElement.setAttribute("' + ATTR + '",c)}catch(e){}</script>';
  }
  function contrastSwitch(el, opts) {
    opts = opts || {}; var key = opts.key || 'mise.contrast', html = document.documentElement;
    var mq = root.matchMedia ? root.matchMedia('(prefers-contrast: more)') : null;
    if (!html.hasAttribute(ATTR)) { try { var saved = localStorage.getItem(key); if (saved === 'more' || saved === 'normal') html.setAttribute(ATTR, saved); } catch (e) { /* no storage */ } }
    var b = document.createElement('button'); b.type = 'button'; b.className = 'mise-contrast'; b.textContent = opts.label || 'High contrast';
    function active() { var a = html.getAttribute(ATTR); return a === 'more' || (a !== 'normal' && !!(mq && mq.matches)); }
    function sync() { b.setAttribute('aria-pressed', String(active())); }
    b.addEventListener('click', function () {
      var next = active() ? 'normal' : 'more'; html.setAttribute(ATTR, next);
      try { localStorage.setItem(key, next); } catch (e) { /* private mode: still works for this page */ }
      sync();
    });
    if (mq && mq.addEventListener) mq.addEventListener('change', sync);
    el.appendChild(b); sync();
    return { button: b, active: active };
  }

  var api = { plain: plain, effective: effective, css: css, store: store, toggle: toggle, contrastSwitch: contrastSwitch, bootScript: bootScript, mutedRoles: mutedRoles, TARGET: TARGET, ATTR: ATTR };
  root.KitchenSprinkles = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* ── delivery/src/apply.js ── */
/* delivery · MiseApply: one recipe → what any web view needs (build phase 6)
   The core every wrapper calls, so React, Svelte, Electron, pywebview and plain HTML render a recipe the same way.

   css(recipe, opts)      → the whole look as CSS text: frosting's colours (Plain greys when Sprinkles is off), the
                             prefers-contrast / High contrast block (J3), fontdant's @font-face aliases and :root vars
   head(recipe, opts)     → { html, preloads, style, css, htmlAttrs } for the first HTML bytes (a server, a build
                             step, a Python string): no flash, no jump
   apply(recipe, opts)    → writes the same into a live document: one <style id="mise">, the mode attribute on <html>.
                             Synchronous, so a <script> in <head> applies it before first paint; returns classes(recipe)
   classes(recipe)        → { styleName: 'fd-…' } for every role, step and variant (extension roles included)
   fontFiles(recipe, opts)→ the font files the look uses ({ id, file, url }) so a host can copy or serve them
   opts: { baseUrl ('fonts'), doc (document), id ('mise'), frostingPrefix ('fr') }

   Plain script (window.MiseApply) or require()-able. Needs FrostingTokens, FrostingColor, FontdantTokens,
   FontdantLibrary, FontdantFonts, FontdantCheck, FontdantEmit, KitchenRecipe, KitchenSprinkles (dist/mise.js
   bundles them all). */
(function (root) {
  'use strict';
  function need(name) { var v = root[name]; if (!v) throw new Error('MiseApply needs ' + name + ' (load dist/mise.js)'); return v; }

  /* a recipe as stored (any shape) → a clean one; colours default to frosting's for the recipe's scheme */
  function clean(recipe) {
    var FT = need('FrostingTokens'), R = need('KitchenRecipe');
    var scheme = recipe && recipe.scheme === 'Dark' ? 'Dark' : 'Light';
    return R.clean(recipe || {}, { scheme: scheme, colors: scheme === 'Dark' ? FT.dark : FT.light });
  }
  function colorCss(r, prefix) {
    var S = need('KitchenSprinkles'), colors = S.effective(r), p = prefix || need('FrostingTokens').prefix || 'fr';
    var decl = Object.keys(colors).map(function (k) { return '--' + p + '-' + k + ': ' + colors[k] + ';'; }).join('\n  ');
    var contrast = S.css(r.frosting.colors, { prefix: p });
    // :root:root:root (specificity 0,3,0) so the recipe beats frosting.css's own scheme defaults
    // (:root:not([data-theme="light"]) under prefers-color-scheme: dark, and :root[data-theme="dark"], both 0,2,0):
    // a recipe's colours hold on a dark-mode system too. Sprinkles' contrast block uses !important and still wins.
    return ':root:root:root {\n  ' + decl + '\n  color-scheme: ' + (r.scheme === 'Dark' ? 'dark' : 'light') + ';\n}' + (contrast ? '\n' + contrast : '');
  }
  function css(recipe, opts) {
    opts = opts || {}; var r = clean(recipe);
    return colorCss(r, opts.frostingPrefix) + '\n' + need('FontdantEmit').css(r.fontdant, { baseUrl: opts.baseUrl || 'fonts' });
  }
  function head(recipe, opts) {
    opts = opts || {}; var r = clean(recipe);
    var h = need('FontdantEmit').head(r.fontdant, { baseUrl: opts.baseUrl || 'fonts', id: opts.id || 'mise' });
    var text = colorCss(r, opts.frostingPrefix) + '\n' + h.css;
    var style = '<style id="' + (opts.id || 'mise') + '">' + text.replace(/<\/style/gi, '<\\/style') + '</style>';
    return { html: h.preloads + style, preloads: h.preloads, style: style, css: text, htmlAttrs: h.htmlAttrs };
  }
  function apply(recipe, opts) {
    opts = opts || {}; var doc = opts.doc || root.document, r = clean(recipe), id = opts.id || 'mise';
    var T = need('FontdantTokens'), attr = 'data-' + T.prefix + '-mode';
    var tag = doc.getElementById(id);
    if (!tag) { tag = doc.createElement('style'); tag.id = id; (doc.head || doc.documentElement).appendChild(tag); }
    tag.textContent = css(r, opts);
    var mode = r.fontdant.mode;
    if (mode && mode !== T.defaultMode) doc.documentElement.setAttribute(attr, mode); else doc.documentElement.removeAttribute(attr);
    return classes(r);
  }
  function classes(recipe) {
    var T = need('FontdantTokens'), C = need('FontdantCheck'), r = recipe && recipe.frosting ? recipe : clean(recipe), p = T.prefix, out = {};
    var variant = {}; (T.styles || []).forEach(function (s) { if (s.variant) variant[s.name] = s.role; });
    C.resolve(r.fontdant).styles.forEach(function (s) {
      out[s.name] = s.kind === 'variant' || variant[s.name] ? p + '-' + s.role + '--' + s.name.slice(s.role.length + 1) : p + '-' + s.name;
    });
    return out;
  }
  function fontFiles(recipe, opts) {
    opts = opts || {}; var r = clean(recipe), F = need('FontdantFonts'), base = (opts.baseUrl || 'fonts').replace(/\/$/, '');
    if (r.fontdant.fonts) F.use(r.fontdant.fonts);
    var faces = F.facesOf(r.fontdant), seen = {}, out = [];
    Object.keys(faces).forEach(function (slot) {
      var e = F.entryOf(faces[slot]); if (!e || seen[e.id]) return; seen[e.id] = 1;
      (e.files || []).forEach(function (f) {
        var file = typeof f === 'string' ? f : f.file || f.src; if (!file) return;
        var src = typeof f === 'object' && f.src ? f.src : null;
        out.push({ id: e.id, family: e.family, file: file, weight: typeof f === 'object' ? f.weight : null, style: (typeof f === 'object' && f.style) || 'normal', variable: !!(e.weights && e.weights.kind === 'variable'),
          url: src || base + '/' + e.id + '/' + file, inline: !!(src && /^data:/.test(src)), external: !!(src && /^(https?:)?\/\//.test(src)) });
      });
    });
    return out;
  }

  var api = { clean: clean, css: css, head: head, apply: apply, classes: classes, fontFiles: fontFiles };
  root.MiseApply = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* ── delivery/src/dtcg.js ── */
/* delivery · MiseDTCG: a recipe as W3C Design Tokens, Format Module 2025.10 (decision F3: export only;
   type-tokens.json and the recipe stay the source of truth).

   export(recipe, opts) → a .tokens.json object:
     color.*            $type color: frosting's roles as {colorSpace: "srgb", components, hex}; the colours visitors
                        see (Plain greys when Sprinkles is off; the designed ones are kept in $extensions)
     font.family.*      $type fontFamily: the three face slots (the real family, then the slot's generic stack)
     font.weight.*      $type fontWeight: the five weight dials
     font.size.*        $type dimension: the mode's size steps in rem (a fluid clamp() exports as its minimum)
     typography.*       $type typography: every role, step and variant: fontFamily, fontSize, fontWeight,
                        letterSpacing (em tracking → rem at that size), lineHeight, by reference where it can
   Anything DTCG has no field for (case, tabular numbers, italic, the class name, the fit factor) goes under
   $extensions["com.chromaglow.mise"]. opts: { mode } to export another mode than the recipe's.
   Plain script (window.MiseDTCG) or require()-able. Needs what MiseApply needs. */
(function (root) {
  'use strict';
  var EXT = 'com.chromaglow.mise';
  function r4(n) { return Math.round(n * 10000) / 10000; }
  function rem(px) { return { value: r4(px / 16), unit: 'rem' }; }
  function color(hex) {
    var h = String(hex).replace('#', ''); if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var c = [0, 2, 4].map(function (i) { return r4(parseInt(h.slice(i, i + 2), 16) / 255); });
    return { colorSpace: 'srgb', components: c, hex: '#' + h.toLowerCase() };
  }
  function ext(o) { var e = {}; e[EXT] = o; return e; }

  function exportTokens(recipe, opts) {
    opts = opts || {};
    var A = root.MiseApply, T = root.FontdantTokens, C = root.FontdantCheck, F = root.FontdantFonts, S = root.KitchenSprinkles, FT = root.FrostingTokens;
    var r = A.clean(recipe), look = JSON.parse(JSON.stringify(r.fontdant)); if (opts.mode) look.mode = opts.mode;
    var R = C.resolve(look), faces = F.facesOf(look), seen = r.frosting.colors, shown = S.effective(r);
    var out = { $description: 'Mise recipe "' + r.name + '" as W3C Design Tokens (Format Module 2025.10). Exported from mise; the recipe is the source of truth.',
      $extensions: ext({ recipe: r.name, client: r.client, scheme: r.scheme, mode: R.mode, sprinkles: r.sprinkles, format: '2025.10' }) };

    // colours
    var roleInfo = {}; (FT.roles || []).forEach(function (x) { roleInfo[x.name] = x; });
    out.color = { $type: 'color' };
    Object.keys(shown).forEach(function (k) {
      var t = { $value: color(shown[k]) }, info = roleInfo[k];
      if (info && info.use) t.$description = info.use;
      if (String(shown[k]).toUpperCase() !== String(seen[k]).toUpperCase()) t.$extensions = ext({ designed: color(seen[k]), plain: true });
      out.color[k] = t;
    });

    // faces
    out.font = { family: { $type: 'fontFamily' }, weight: { $type: 'fontWeight' }, size: { $type: 'dimension' } };
    ['display', 'text', 'mono'].forEach(function (slot) {
      var e = F.entryOf(faces[slot]), generic = (T.faces[slot] && T.faces[slot].generic) || 'sans-serif';
      var stack = [e ? e.family : faces[slot]].concat(generic.split(',').map(function (s) { return s.trim().replace(/^["']|["']$/g, ''); }));
      out.font.family[slot] = { $value: stack, $description: (T.faces[slot] && T.faces[slot].use) || slot,
        $extensions: ext(e ? { fontId: e.id, fit: r4(F.fitFactor(e, slot)), sizeAdjust: Math.round(F.fitFactor(e, slot) * 10000) / 100 + '%', licence: e.licence ? (e.licence.id || e.licence.spdx || null) : null } : {}) };
    });
    Object.keys(R.weights).forEach(function (k) { out.font.weight[k] = { $value: R.weights[k] }; });
    T.stepOrder.forEach(function (s) {
      var t = { $value: rem(R.stepPx[s]) };
      if (/clamp\(/.test(String(R.steps[s]))) t.$extensions = ext({ css: String(R.steps[s]), note: 'fluid: exported at its minimum' });
      out.font.size[s] = t;
    });

    // typography: one composite per emitted style
    var cls = A.classes(r);
    out.typography = { $type: 'typography' };
    R.styles.forEach(function (s) {
      var lead = typeof s.leading === 'number' ? s.leading : parseFloat(s.leading);
      var v = {
        fontFamily: '{font.family.' + s.face + '}',
        fontSize: s.step ? '{font.size.' + s.step + '}' : rem(s.sizePx),
        fontWeight: s.weightDial ? '{font.weight.' + s.weightDial + '}' : s.weight,
        letterSpacing: rem((isNaN(s.trackingEm) ? 0 : s.trackingEm) * s.sizePx),
        lineHeight: lead,
      };
      out.typography[s.name] = { $value: v, $extensions: ext({ class: cls[s.name], role: s.role, kind: s.kind, case: s.case, tnum: s.tnum, italic: s.italic, tracking: s.tracking, sizePx: s.sizePx, extension: s.extension || undefined }) };
    });
    return out;
  }

  var api = { export: exportTokens, color: color, EXT: EXT };
  root.MiseDTCG = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* require() → MiseApply; everything else is on globalThis */
if (typeof module !== 'undefined' && module.exports) module.exports = (typeof window !== 'undefined' ? window : globalThis).MiseApply;
