/**
 * Build-time UTF-8 character density analyzer.
 *
 * Renders every printable Unicode character onto an offscreen canvas,
 * measures visual density (overall + 4 directional), and outputs sorted
 * character ramps to src/generated/charmap.ts.
 *
 * Run: bun run scripts/generate-charmap.ts
 * Requires: @napi-rs/canvas (devDependency)
 */

import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Configuration ──────────────────────────────────────────────

const CELL_SIZE = 24; // pixels per cell (half-width)
const FONT_SIZE = 20; // px, tuned to fill CELL_SIZE well
const FONT_FAMILY = "Consolas, Courier New, monospace";

const DENSITY_RAMP_LEVELS = 257; // 256 brightness values + space
const DIRECTIONAL_RAMP_LEVELS = 64;

// ── Types ──────────────────────────────────────────────────────

interface CharMetrics {
	ch: string;
	codePoint: number;
	density: number;
	horizontal: number;
	vertical: number;
	fwDiagonal: number;
	bwDiagonal: number;
	isFullWidth: boolean;
}

// ── Unicode Filtering ──────────────────────────────────────────

// Only include "code-friendly" Unicode blocks that feel natural in a terminal/editor.
// Excludes Arabic, Hebrew, Thai, CJK, Devanagari, Emoji, etc.
const ALLOWED_RANGES: [number, number][] = [
	[0x0020, 0x007e], // Basic Latin (ASCII printable)
	[0x00a0, 0x00ff], // Latin-1 Supplement (é, ü, ñ, ...)
	[0x0100, 0x024f], // Latin Extended-A & B
	[0x0250, 0x02af], // IPA Extensions
	[0x02b0, 0x02ff], // Spacing Modifier Letters
	[0x0370, 0x03ff], // Greek and Coptic (α, β, Σ, Ω, ...)
	[0x0400, 0x04ff], // Cyrillic (many look like Latin)
	[0x1d00, 0x1dbf], // Phonetic Extensions + Supplement
	[0x1e00, 0x1eff], // Latin Extended Additional
	[0x1f00, 0x1fff], // Greek Extended
	[0x2000, 0x206f], // General Punctuation
	[0x2070, 0x209f], // Superscripts and Subscripts
	[0x20a0, 0x20cf], // Currency Symbols
	[0x2100, 0x214f], // Letterlike Symbols (℃, №, ℮, ...)
	[0x2150, 0x218f], // Number Forms (⅓, ⅔, Ⅳ, ...)
	[0x2190, 0x21ff], // Arrows
	[0x2200, 0x22ff], // Mathematical Operators
	[0x2300, 0x23ff], // Miscellaneous Technical
	[0x2500, 0x257f], // Box Drawing
	[0x2580, 0x259f], // Block Elements
	[0x25a0, 0x25ff], // Geometric Shapes
	[0x2600, 0x26ff], // Miscellaneous Symbols (♠, ♣, ★, ...)
	[0x2700, 0x27bf], // Dingbats
	[0x27c0, 0x27ef], // Misc Mathematical Symbols-A
	[0x27f0, 0x27ff], // Supplemental Arrows-A
	[0x2800, 0x28ff], // Braille Patterns
	[0x2900, 0x297f], // Supplemental Arrows-B
	[0x2980, 0x29ff], // Misc Mathematical Symbols-B
	[0x2a00, 0x2aff], // Supplemental Mathematical Operators
	[0x2b00, 0x2bff], // Miscellaneous Symbols and Arrows
	[0x2c60, 0x2c7f], // Latin Extended-C
	[0xa720, 0xa7ff], // Latin Extended-D
	[0xfb00, 0xfb06], // Alphabetic Presentation Forms (ﬁ, ﬂ, ﬃ, ...)
];

const EXCLUDE_CATEGORIES =
	/^\p{Cc}$|^\p{Cf}$|^\p{Cs}$|^\p{Co}$|^\p{Cn}$|^\p{M}$|^\p{Zl}$|^\p{Zp}$/u;

const ZERO_WIDTH = new Set([
	0x00ad, 0x034f, 0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x2028, 0x2029,
	0x2060, 0x2061, 0x2062, 0x2063, 0x2064, 0x206a, 0x206b, 0x206c, 0x206d,
	0x206e, 0x206f, 0xfeff, 0xfff9, 0xfffa, 0xfffb,
]);

function isInAllowedRange(cp: number): boolean {
	for (const [lo, hi] of ALLOWED_RANGES) {
		if (cp >= lo && cp <= hi) return true;
	}
	return false;
}

function shouldInclude(cp: number): boolean {
	if (!isInAllowedRange(cp)) return false;
	if (ZERO_WIDTH.has(cp)) return false;
	if (cp >= 0xfdd0 && cp <= 0xfdef) return false;
	if ((cp & 0xfffe) === 0xfffe) return false;

	const ch = String.fromCodePoint(cp);
	if (EXCLUDE_CATEGORIES.test(ch)) return false;

	return true;
}

// ── Canvas Setup ───────────────────────────────────────────────

function createMeasurementCanvas(
	width: number,
	height: number,
): { canvas: ReturnType<typeof createCanvas>; ctx: SKRSContext2D } {
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext("2d");
	ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
	ctx.textBaseline = "top";
	ctx.textAlign = "left";
	ctx.fillStyle = "#ffffff";
	return { canvas, ctx };
}

// ── Tofu Detection ─────────────────────────────────────────────

function renderChar(
	ctx: SKRSContext2D,
	ch: string,
	width: number,
	height: number,
): Uint8ClampedArray {
	ctx.clearRect(0, 0, width, height);
	ctx.fillText(ch, 0, 2);
	return ctx.getImageData(0, 0, width, height).data;
}

function pixelSignature(data: Uint8ClampedArray): Uint8Array {
	// Extract alpha channel as a compact signature
	const sig = new Uint8Array(data.length / 4);
	for (let i = 0; i < sig.length; i++) {
		sig[i] = data[i * 4 + 3];
	}
	return sig;
}

function signaturesMatch(a: Uint8Array, b: Uint8Array, threshold: number): boolean {
	if (a.length !== b.length) return false;
	let diffPixels = 0;
	for (let i = 0; i < a.length; i++) {
		if (Math.abs(a[i] - b[i]) > 10) diffPixels++;
	}
	return diffPixels / a.length < threshold;
}

function isBlank(data: Uint8ClampedArray): boolean {
	for (let i = 3; i < data.length; i += 4) {
		if (data[i] > 0) return false;
	}
	return true;
}

// ── Density Measurement ────────────────────────────────────────

function overallDensity(data: Uint8ClampedArray, width: number, height: number): number {
	let filled = 0;
	const total = width * height;
	for (let i = 0; i < total; i++) {
		filled += data[i * 4 + 3] / 255;
	}
	return filled / total;
}

function horizontalDensity(data: Uint8ClampedArray, width: number, height: number): number {
	let score = 0;
	for (let y = 0; y < height; y++) {
		let rowFill = 0;
		for (let x = 0; x < width; x++) {
			rowFill += data[(y * width + x) * 4 + 3] / 255;
		}
		const ratio = rowFill / width;
		score += ratio * ratio; // square to favor continuous strokes
	}
	return score / height;
}

function verticalDensity(data: Uint8ClampedArray, width: number, height: number): number {
	let score = 0;
	for (let x = 0; x < width; x++) {
		let colFill = 0;
		for (let y = 0; y < height; y++) {
			colFill += data[(y * width + x) * 4 + 3] / 255;
		}
		const ratio = colFill / height;
		score += ratio * ratio;
	}
	return score / width;
}

function fwDiagonalDensity(data: Uint8ClampedArray, w: number, h: number): number {
	// Forward diagonal (/): anti-diagonals where x + y = d
	let score = 0;
	let diagCount = 0;
	for (let d = 0; d < w + h - 1; d++) {
		let diagFill = 0;
		let diagLen = 0;
		const xStart = Math.max(0, d - h + 1);
		const xEnd = Math.min(w, d + 1);
		for (let x = xStart; x < xEnd; x++) {
			const y = d - x;
			diagFill += data[(y * w + x) * 4 + 3] / 255;
			diagLen++;
		}
		if (diagLen > 0) {
			const ratio = diagFill / diagLen;
			score += ratio * ratio;
			diagCount++;
		}
	}
	return diagCount > 0 ? score / diagCount : 0;
}

function bwDiagonalDensity(data: Uint8ClampedArray, w: number, h: number): number {
	// Backward diagonal (\): diagonals where x - y = d
	let score = 0;
	let diagCount = 0;
	for (let d = -(h - 1); d < w; d++) {
		let diagFill = 0;
		let diagLen = 0;
		const xStart = Math.max(0, d);
		const xEnd = Math.min(w, d + h);
		for (let x = xStart; x < xEnd; x++) {
			const y = x - d;
			diagFill += data[(y * w + x) * 4 + 3] / 255;
			diagLen++;
		}
		if (diagLen > 0) {
			const ratio = diagFill / diagLen;
			score += ratio * ratio;
			diagCount++;
		}
	}
	return diagCount > 0 ? score / diagCount : 0;
}

// ── Width Classification ───────────────────────────────────────

function classifyWidth(ctx: SKRSContext2D, ch: string, referenceWidth: number): boolean {
	const metrics = ctx.measureText(ch);
	return metrics.width > referenceWidth * 1.5;
}

// ── Quantization ───────────────────────────────────────────────

function quantize(sorted: CharMetrics[], levels: number): string[] {
	if (sorted.length === 0) return [" "];
	if (sorted.length <= levels) return sorted.map((c) => c.ch);

	const result: string[] = [];
	for (let i = 0; i < levels; i++) {
		const idx = Math.round((i * (sorted.length - 1)) / (levels - 1));
		result.push(sorted[idx].ch);
	}
	return result;
}

/** Select top characters by directional score, then sort by overall density */
function quantizeDirectional(
	all: CharMetrics[],
	levels: number,
	getScore: (m: CharMetrics) => number,
): string[] {
	// Pick characters where this direction is their dominant direction
	const candidates = all
		.filter((m) => {
			const score = getScore(m);
			return (
				score > 0.01 &&
				score >= m.horizontal * 0.8 &&
				score >= m.vertical * 0.8 &&
				score >= m.fwDiagonal * 0.8 &&
				score >= m.bwDiagonal * 0.8
			);
		})
		.sort((a, b) => getScore(b) - getScore(a));

	// Take top N*3 candidates, then quantize by overall density for even spacing
	const pool = candidates.slice(0, levels * 3);
	pool.sort((a, b) => b.density - a.density);
	return quantize(pool, levels);
}

// ── Main ───────────────────────────────────────────────────────

function main(): void {
	const startTime = performance.now();

	// Half-width canvas
	const halfWidth = CELL_SIZE;
	const halfHeight = CELL_SIZE;
	const { ctx: ctxHalf } = createMeasurementCanvas(halfWidth, halfHeight);

	// Full-width canvas (double width for CJK)
	const fullWidth = CELL_SIZE * 2;
	const fullHeight = CELL_SIZE;
	const { ctx: ctxFull } = createMeasurementCanvas(fullWidth, fullHeight);

	// Measure reference width for 'M' (known half-width)
	const refWidth = ctxHalf.measureText("M").width;

	// Render tofu reference (U+FFFF is guaranteed noncharacter)
	const tofuData = renderChar(ctxHalf, "\uFFFF", halfWidth, halfHeight);
	const tofuSig = pixelSignature(tofuData);
	const tofuFullData = renderChar(ctxFull, "\uFFFF", fullWidth, fullHeight);
	const tofuFullSig = pixelSignature(tofuFullData);

	const halfChars: CharMetrics[] = [];
	const fullChars: CharMetrics[] = [];
	let scanned = 0;
	let measured = 0;
	let skippedTofu = 0;
	let skippedBlank = 0;

	// Scan up to the end of the last allowed range
	const scanEnd = ALLOWED_RANGES[ALLOWED_RANGES.length - 1][1];
	for (let cp = 0x0020; cp <= scanEnd; cp++) {
		if (!shouldInclude(cp)) continue;
		scanned++;

		const ch = String.fromCodePoint(cp);
		const isFull = classifyWidth(ctxHalf, ch, refWidth);

		const ctx = isFull ? ctxFull : ctxHalf;
		const w = isFull ? fullWidth : halfWidth;
		const h = isFull ? fullHeight : halfHeight;

		const data = renderChar(ctx, ch, w, h);

		// Skip blank characters (except actual space U+0020)
		if (cp !== 0x0020 && isBlank(data)) {
			skippedBlank++;
			continue;
		}

		// Skip tofu (unrenderable characters)
		if (cp !== 0x0020) {
			const sig = pixelSignature(data);
			const tofuRef = isFull ? tofuFullSig : tofuSig;
			if (signaturesMatch(sig, tofuRef, 0.05)) {
				skippedTofu++;
				continue;
			}
		}

		const metrics: CharMetrics = {
			ch,
			codePoint: cp,
			density: overallDensity(data, w, h),
			horizontal: horizontalDensity(data, w, h),
			vertical: verticalDensity(data, w, h),
			fwDiagonal: fwDiagonalDensity(data, w, h),
			bwDiagonal: bwDiagonalDensity(data, w, h),
			isFullWidth: isFull,
		};

		if (isFull) {
			fullChars.push(metrics);
		} else {
			halfChars.push(metrics);
		}
		measured++;

		if (scanned % 5000 === 0) {
			console.log(
				`  scanned ${scanned}, measured ${measured} (tofu: ${skippedTofu}, blank: ${skippedBlank})`,
			);
		}
	}

	console.log(
		`Scan complete: ${scanned} code points scanned, ${measured} measured ` +
			`(${halfChars.length} half-width, ${fullChars.length} full-width, ` +
			`${skippedTofu} tofu, ${skippedBlank} blank)`,
	);

	// Sort by density (dense → light)
	halfChars.sort((a, b) => b.density - a.density);
	fullChars.sort((a, b) => b.density - a.density);

	// Ensure ramps end with space
	const ensureSpaceEnd = (ramp: string[]): string[] => {
		const filtered = ramp.filter((ch) => ch !== " ");
		filtered.push(" ");
		return filtered;
	};

	// Build ramps
	const densityHalf = ensureSpaceEnd(quantize(halfChars, DENSITY_RAMP_LEVELS));
	const densityFull = ensureSpaceEnd(quantize(fullChars, DENSITY_RAMP_LEVELS));

	// Combine half + full for directional ramps (direction matters regardless of width)
	const allChars = [...halfChars, ...fullChars];

	const horizontalRamp = ensureSpaceEnd(
		quantizeDirectional(allChars, DIRECTIONAL_RAMP_LEVELS, (m) => m.horizontal),
	);
	const verticalRamp = ensureSpaceEnd(
		quantizeDirectional(allChars, DIRECTIONAL_RAMP_LEVELS, (m) => m.vertical),
	);
	const fwDiagonalRamp = ensureSpaceEnd(
		quantizeDirectional(allChars, DIRECTIONAL_RAMP_LEVELS, (m) => m.fwDiagonal),
	);
	const bwDiagonalRamp = ensureSpaceEnd(
		quantizeDirectional(allChars, DIRECTIONAL_RAMP_LEVELS, (m) => m.bwDiagonal),
	);

	// Escape string for safe embedding in TypeScript
	const escapeForTs = (chars: string[]): string => {
		return chars
			.map((ch) => {
				const cp = ch.codePointAt(0)!;
				if (ch === "\\") return "\\\\";
				if (ch === '"') return '\\"';
				if (ch === "`") return "\\`";
				if (ch === "$") return "\\$";
				if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) return `\\u{${cp.toString(16)}}`;
				return ch;
			})
			.join("");
	};

	const timestamp = new Date().toISOString();
	// Biome requires long array spreads to be on their own indented line
	const rampLine = (chars: string[]) =>
		`[\n\t...\`${escapeForTs(chars)}\`,\n]`;

	const output = `// Auto-generated by scripts/generate-charmap.ts — DO NOT EDIT
// Generated: ${timestamp}
// Font: ${FONT_FAMILY} ${FONT_SIZE}px on ${CELL_SIZE}x${CELL_SIZE} canvas
// Scanned: ${scanned} code points, Measured: ${measured} characters
// Half-width: ${halfChars.length}, Full-width: ${fullChars.length}

/** Half-width chars sorted by visual density, dark→light (${densityHalf.length} levels) */
export const DENSITY_RAMP_HALF: readonly string[] = ${rampLine(densityHalf)};

/** Full-width chars sorted by visual density, dark→light (${densityFull.length} levels) */
export const DENSITY_RAMP_FULL: readonly string[] = ${rampLine(densityFull)};

/** Chars with strong horizontal strokes, sorted by density (${horizontalRamp.length}) */
export const HORIZONTAL_RAMP: readonly string[] = ${rampLine(horizontalRamp)};

/** Chars with strong vertical strokes, sorted by density (${verticalRamp.length}) */
export const VERTICAL_RAMP: readonly string[] = ${rampLine(verticalRamp)};

/** Chars with forward diagonal (/) strokes, sorted by density (${fwDiagonalRamp.length}) */
export const FW_DIAGONAL_RAMP: readonly string[] = ${rampLine(fwDiagonalRamp)};

/** Chars with backward diagonal (\\\\) strokes, sorted by density (${bwDiagonalRamp.length}) */
export const BW_DIAGONAL_RAMP: readonly string[] = ${rampLine(bwDiagonalRamp)};
`;

	const outPath = resolve(import.meta.dir, "../src/generated/charmap.ts");
	writeFileSync(outPath, output, "utf-8");

	const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
	console.log(`\nWrote ${outPath}`);
	console.log(`  DENSITY_RAMP_HALF: ${densityHalf.length} chars`);
	console.log(`  DENSITY_RAMP_FULL: ${densityFull.length} chars`);
	console.log(`  HORIZONTAL_RAMP: ${horizontalRamp.length} chars`);
	console.log(`  VERTICAL_RAMP: ${verticalRamp.length} chars`);
	console.log(`  FW_DIAGONAL_RAMP: ${fwDiagonalRamp.length} chars`);
	console.log(`  BW_DIAGONAL_RAMP: ${bwDiagonalRamp.length} chars`);
	console.log(`  Completed in ${elapsed}s`);
}

main();
