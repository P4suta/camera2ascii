# camera2ascii

Real-time webcam to ASCII art converter running entirely in the browser.

**[Live Demo](https://p4suta.github.io/camera2ascii/)**

![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)

## Features

- Real-time webcam capture via `getUserMedia`
- 10+ character sets including algorithmically density-analyzed Unicode (257 levels)
- Color modes: monochrome, full color, green terminal
- Adjustable columns, font size, and FPS
- Custom character ramp input
- Mirror mode for selfie view
- Zero runtime dependencies — pure TypeScript + browser APIs

## Character Sets

| Name | Characters | Description |
|------|-----------|-------------|
| Standard | `@%#*+=-:. ` | Classic ASCII art (10 levels) |
| Detailed | 70 chars | Fine-grained ASCII |
| Unicode | 257 chars | Algorithmically density-analyzed from 2,154 Unicode characters |
| Braille | 255 chars | Unicode braille patterns, near-grayscale resolution |
| Kanji | 60+ chars | CJK characters sorted by stroke count |
| Blocks | `█▓▒░ ` | Unicode block elements |
| Shade | `█▉▊▋▌▍▎▏ ` | Horizontal shade blocks (8 levels) |
| Geometric | `◆◉●◍◐◑○◌· ` | Geometric shapes |
| Box | 20+ chars | Box drawing characters |
| Custom | user-defined | Enter any characters as a density ramp |

### Unicode Density Analysis

The Unicode character set is generated at build time by `scripts/generate-charmap.ts`:

1. Scans 4,724 code points from code-friendly Unicode blocks (Latin, Greek, Cyrillic, box drawing, math symbols, arrows, braille)
2. Renders each character onto a 24x24 canvas using `@napi-rs/canvas`
3. Measures visual density (ink pixels / total pixels) with anti-aliasing-aware alpha weighting
4. Detects and excludes tofu (unrenderable glyphs) and blank characters
5. Quantizes 2,154 measured characters into 257 evenly-spaced density levels

Also generates directional density ramps (horizontal, vertical, forward/backward diagonal) for future edge-aware rendering.

## Getting Started

```bash
bun install
bun run dev
```

Open `index.html` in a browser and click **Start**.

## Scripts

```bash
bun run dev              # Development build (watch mode)
bun run build            # Production build (dist/)
bun test                 # Run tests
bun test --coverage      # Tests with coverage
bun run lint             # Biome lint
bun run format           # Biome format
bun run check            # Lint + type check
bun run generate:charmap # Regenerate Unicode density data
```

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Bundler / Runtime**: Bun
- **Linter / Formatter**: Biome
- **Testing**: Bun test runner + fast-check (property-based)
- **Deploy**: GitHub Pages (static)
- **Canvas analysis**: @napi-rs/canvas (build-time only)

## Architecture

```
src/
├── main.ts          # App entry, render loop
├── camera.ts        # getUserMedia webcam capture
├── converter.ts     # Pixel → character mapping (brightness, ramps)
├── renderer.ts      # DOM rendering (mono: textContent, color: span reuse)
├── controls.ts      # UI control panel
├── types.ts         # AppState, AsciiFrame, CharRamp types
├── dom.ts           # Type-safe DOM element factory
├── styles.ts        # CSS injection
├── assert.ts        # Contract assertions
├── generated/
│   └── charmap.ts   # Auto-generated Unicode density ramps
└── __tests__/       # Test files

scripts/
└── generate-charmap.ts  # Build-time character density analyzer
```

