import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { imageDataToAscii, RAMP } from "../converter";

function makeImageData(
	width: number,
	height: number,
	fill: [number, number, number, number],
): ImageData {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let i = 0; i < width * height; i++) {
		data[i * 4] = fill[0];
		data[i * 4 + 1] = fill[1];
		data[i * 4 + 2] = fill[2];
		data[i * 4 + 3] = fill[3];
	}
	return { data, width, height, colorSpace: "srgb" } as ImageData;
}

describe("RAMP", () => {
	test("is non-empty", () => {
		expect(RAMP.length).toBeGreaterThan(0);
	});

	test("ends with space", () => {
		expect(RAMP[RAMP.length - 1]).toBe(" ");
	});

	test("has 257 levels", () => {
		expect(RAMP.length).toBe(257);
	});
});

describe("imageDataToAscii", () => {
	test("output chars length equals pixel count", () => {
		const img = makeImageData(4, 3, [128, 128, 128, 255]);
		const frame = imageDataToAscii(img, RAMP);
		expect(frame.chars.length).toBe(12);
	});

	test("all white pixels map to densest char", () => {
		const img = makeImageData(3, 3, [255, 255, 255, 255]);
		const frame = imageDataToAscii(img, RAMP);
		expect(frame.chars[0]).toBe(RAMP[0]);
		for (const ch of frame.chars) {
			expect(ch).toBe(frame.chars[0]);
		}
	});

	test("all black pixels map to space", () => {
		const img = makeImageData(3, 3, [0, 0, 0, 255]);
		const frame = imageDataToAscii(img, RAMP);
		for (const ch of frame.chars) {
			expect(ch).toBe(" ");
		}
	});

	test("empty ramp throws", () => {
		const img = makeImageData(1, 1, [128, 128, 128, 255]);
		expect(() => imageDataToAscii(img, [])).toThrow("character ramp");
	});

	test("single-char ramp works", () => {
		const img = makeImageData(2, 2, [128, 128, 128, 255]);
		const frame = imageDataToAscii(img, ["X"]);
		for (const ch of frame.chars) {
			expect(ch).toBe("X");
		}
	});
});

describe("property-based", () => {
	const uint8 = fc.integer({ min: 0, max: 255 });

	test("output chars.length always equals width * height", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 50 }),
				fc.integer({ min: 1, max: 50 }),
				uint8,
				uint8,
				uint8,
				(w, h, r, g, b) => {
					const data = new Uint8ClampedArray(w * h * 4);
					for (let i = 0; i < w * h; i++) {
						data[i * 4] = r;
						data[i * 4 + 1] = g;
						data[i * 4 + 2] = b;
						data[i * 4 + 3] = 255;
					}
					const img = { data, width: w, height: h, colorSpace: "srgb" } as ImageData;
					const frame = imageDataToAscii(img, RAMP);
					return frame.chars.length === w * h;
				},
			),
		);
	});

	test("uniform input produces uniform output", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 30 }),
				fc.integer({ min: 1, max: 30 }),
				uint8,
				uint8,
				uint8,
				(w, h, r, g, b) => {
					const data = new Uint8ClampedArray(w * h * 4);
					for (let i = 0; i < w * h; i++) {
						data[i * 4] = r;
						data[i * 4 + 1] = g;
						data[i * 4 + 2] = b;
						data[i * 4 + 3] = 255;
					}
					const img = { data, width: w, height: h, colorSpace: "srgb" } as ImageData;
					const frame = imageDataToAscii(img, RAMP);
					const first = frame.chars[0];
					return frame.chars.every((ch) => ch === first);
				},
			),
		);
	});
});
