# camera2ascii

Real-time webcam to ASCII art converter. No buttons. No settings. Just you, in text.

**[Live Demo](https://p4suta.github.io/camera2ascii/)**

![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)

## How it works

Open the page. Allow camera access. That's it.

Your webcam feed is converted to 257-level Unicode character art in real time, rendered directly to a full-screen canvas. No UI controls, no configuration — the app determines the optimal grid size from your window dimensions automatically.

## Under the hood

- **Canvas rendering** — characters are drawn via `fillText()`, not DOM text. No text selection, no layout overhead
- **257-level density ramp** — 2,154 Unicode characters analyzed at build time by rendering each onto a canvas and measuring pixel density
- **Adaptive layout** — column/row count recalculates on window resize
- **Zero dependencies** — pure TypeScript + browser APIs. 6 KB bundled

### Character density analysis

`scripts/generate-charmap.ts` scans code-friendly Unicode blocks (Latin, Greek, Cyrillic, box drawing, math symbols, arrows, braille), renders each character onto a 24x24 canvas, and measures:

- Overall visual density (alpha-weighted pixel coverage)
- Directional density (horizontal, vertical, diagonal stroke weight)

The 2,154 renderable characters are quantized into 257 evenly-spaced density levels — one character per brightness value.

## Development

```bash
bun install
bun run dev              # watch mode
bun run build            # production build
bun test                 # run tests
bun run check            # lint + type check
bun run generate:charmap # regenerate density data
```

## Architecture

```
src/
├── main.ts          # Entry, auto-start, render loop, resize
├── camera.ts        # getUserMedia capture
├── converter.ts     # Pixel → character (257-level ramp)
├── renderer.ts      # Canvas fillText() rendering
├── types.ts         # AppState, AsciiFrame
├── styles.ts        # Minimal CSS
├── assert.ts        # Contract assertions
└── generated/
    └── charmap.ts   # Auto-generated density ramps

scripts/
└── generate-charmap.ts  # Build-time density analyzer
```
