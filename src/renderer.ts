import { assertPositive } from "./assert";
import type { AsciiFrame } from "./types";

const FONT_FAMILY = '"SF Mono", Menlo, Consolas, "Courier New", monospace';
const FONT_SIZE = 14;
const FILL_STYLE = "rgba(255, 255, 255, 0.85)";

export interface CellMetrics {
	cellWidth: number;
	cellHeight: number;
}

export function measureCell(ctx: CanvasRenderingContext2D): CellMetrics {
	ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
	const m = ctx.measureText("M");
	const cellWidth = Math.ceil(m.width);
	const cellHeight = Math.ceil(FONT_SIZE * 1.2);
	return { cellWidth, cellHeight };
}

export function calcGridSize(
	canvasWidth: number,
	canvasHeight: number,
	cell: CellMetrics,
): { cols: number; rows: number } {
	assertPositive(canvasWidth, "canvas width");
	assertPositive(canvasHeight, "canvas height");
	assertPositive(cell.cellWidth, "cell width");
	assertPositive(cell.cellHeight, "cell height");

	return {
		cols: Math.floor(canvasWidth / cell.cellWidth),
		rows: Math.floor(canvasHeight / cell.cellHeight),
	};
}

export function renderFrame(
	ctx: CanvasRenderingContext2D,
	frame: AsciiFrame,
	cols: number,
	cell: CellMetrics,
	canvasWidth: number,
	canvasHeight: number,
): void {
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, canvasWidth, canvasHeight);

	ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
	ctx.fillStyle = FILL_STYLE;
	ctx.textBaseline = "top";

	const { chars } = frame;
	const len = chars.length;

	for (let i = 0; i < len; i++) {
		const col = i % cols;
		const row = Math.floor(i / cols);
		const x = col * cell.cellWidth;
		const y = row * cell.cellHeight;
		ctx.fillText(chars[i], x, y);
	}
}
