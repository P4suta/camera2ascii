import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { calcGridSize } from "../renderer";

describe("calcGridSize", () => {
	test("calculates correct grid dimensions", () => {
		const cell = { cellWidth: 10, cellHeight: 20 };
		const { cols, rows } = calcGridSize(800, 600, cell);
		expect(cols).toBe(80);
		expect(rows).toBe(30);
	});

	test("floors fractional values", () => {
		const cell = { cellWidth: 7, cellHeight: 15 };
		const { cols, rows } = calcGridSize(100, 100, cell);
		expect(cols).toBe(14); // floor(100/7) = 14
		expect(rows).toBe(6); // floor(100/15) = 6
	});

	test("throws on non-positive canvas dimensions", () => {
		const cell = { cellWidth: 10, cellHeight: 20 };
		expect(() => calcGridSize(0, 600, cell)).toThrow("canvas width");
		expect(() => calcGridSize(800, 0, cell)).toThrow("canvas height");
	});

	test("throws on non-positive cell dimensions", () => {
		expect(() => calcGridSize(800, 600, { cellWidth: 0, cellHeight: 20 })).toThrow("cell width");
		expect(() => calcGridSize(800, 600, { cellWidth: 10, cellHeight: 0 })).toThrow("cell height");
	});
});

describe("property-based", () => {
	test("cols * cellWidth <= canvasWidth, rows * cellHeight <= canvasHeight", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 4000 }),
				fc.integer({ min: 1, max: 4000 }),
				fc.integer({ min: 1, max: 50 }),
				fc.integer({ min: 1, max: 50 }),
				(w, h, cw, ch) => {
					const { cols, rows } = calcGridSize(w, h, { cellWidth: cw, cellHeight: ch });
					return cols * cw <= w && rows * ch <= h && cols >= 0 && rows >= 0;
				},
			),
		);
	});
});
