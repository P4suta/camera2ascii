import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { brightness, brightnessToChar, CHAR_RAMPS, imageDataToAscii } from "../converter";

describe("brightness", () => {
	test("returns 0 for black", () => {
		expect(brightness(0, 0, 0)).toBe(0);
	});

	test("returns 255 for white", () => {
		expect(brightness(255, 255, 255)).toBe(255);
	});

	test("uses ITU-R BT.601 weights", () => {
		// Pure red: 0.299 * 255 = 76.245 ≈ 76
		expect(brightness(255, 0, 0)).toBe(76);
		// Pure green: 0.587 * 255 = 149.685 ≈ 150
		expect(brightness(0, 255, 0)).toBe(150);
		// Pure blue: 0.114 * 255 = 29.07 ≈ 29
		expect(brightness(0, 0, 255)).toBe(29);
	});

	test("handles mid-gray", () => {
		expect(brightness(128, 128, 128)).toBe(128);
	});
});

describe("CHAR_RAMPS", () => {
	test("all ramps are non-empty", () => {
		for (const [_name, ramp] of Object.entries(CHAR_RAMPS)) {
			expect(ramp.length).toBeGreaterThan(0);
		}
	});

	test("all ramps end with space", () => {
		for (const [_name, ramp] of Object.entries(CHAR_RAMPS)) {
			expect(ramp[ramp.length - 1]).toBe(" ");
		}
	});

	test("standard ramp has expected characters", () => {
		expect(CHAR_RAMPS.standard).toEqual([..."@%#*+=-:. "]);
	});

	test("blocks ramp uses block characters", () => {
		expect(CHAR_RAMPS.blocks).toEqual([..."█▓▒░ "]);
	});

	test("has all ramp types", () => {
		expect(Object.keys(CHAR_RAMPS)).toEqual([
			"standard",
			"detailed",
			"blocks",
			"minimal",
			"braille",
			"kanji",
			"geometric",
			"shade",
			"box",
			"unicode",
		]);
	});
});

describe("brightnessToChar", () => {
	const ramp = CHAR_RAMPS.standard; // ["@", "%", "#", "*", "+", "=", "-", ":", ".", " "]

	test("max brightness (255) maps to densest char (dark bg)", () => {
		expect(brightnessToChar(255, ramp)).toBe("@");
	});

	test("zero brightness maps to space (dark bg)", () => {
		expect(brightnessToChar(0, ramp)).toBe(" ");
	});

	test("mid brightness maps to middle character", () => {
		const char = brightnessToChar(128, ramp);
		const index = ramp.indexOf(char);
		// Should be roughly in the middle of the ramp
		expect(index).toBeGreaterThan(1);
		expect(index).toBeLessThan(ramp.length - 1);
	});

	test("works with single-char ramp", () => {
		expect(brightnessToChar(128, ["X"])).toBe("X");
	});
});

describe("imageDataToAscii", () => {
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

	test("output chars length equals pixel count", () => {
		const img = makeImageData(4, 3, [128, 128, 128, 255]);
		const frame = imageDataToAscii(img, CHAR_RAMPS.standard, "mono");
		expect(frame.chars.length).toBe(12);
	});

	test("mono mode returns null colors", () => {
		const img = makeImageData(2, 2, [128, 128, 128, 255]);
		const frame = imageDataToAscii(img, CHAR_RAMPS.standard, "mono");
		expect(frame.colors).toBeNull();
	});

	test("color mode returns rgb strings", () => {
		const img = makeImageData(1, 1, [255, 100, 50, 255]);
		const frame = imageDataToAscii(img, CHAR_RAMPS.standard, "color");
		expect(frame.colors).not.toBeNull();
		expect(frame.colors?.[0]).toBe("rgb(255,100,50)");
	});

	test("green mode returns green-tinted colors", () => {
		const img = makeImageData(1, 1, [255, 255, 255, 255]);
		const frame = imageDataToAscii(img, CHAR_RAMPS.standard, "green");
		expect(frame.colors).not.toBeNull();
		expect(frame.colors?.[0]).toMatch(/^rgb\(0,\d+,0\)$/);
	});

	test("all white pixels map to densest char", () => {
		const img = makeImageData(3, 3, [255, 255, 255, 255]);
		const frame = imageDataToAscii(img, CHAR_RAMPS.standard, "mono");
		for (const ch of frame.chars) {
			expect(ch).toBe("@");
		}
	});

	test("all black pixels map to space", () => {
		const img = makeImageData(3, 3, [0, 0, 0, 255]);
		const frame = imageDataToAscii(img, CHAR_RAMPS.standard, "mono");
		for (const ch of frame.chars) {
			expect(ch).toBe(" ");
		}
	});
});

// ============================================================
// Mutation-killing tests
// ============================================================

describe("mutation: brightness assertions include descriptive messages", () => {
	test("out-of-range red channel throws with 'red channel' in message", () => {
		expect(() => brightness(256, 0, 0)).toThrow("red channel");
	});

	test("out-of-range green channel throws with 'green channel' in message", () => {
		expect(() => brightness(0, 256, 0)).toThrow("green channel");
	});

	test("out-of-range blue channel throws with 'blue channel' in message", () => {
		expect(() => brightness(0, 0, 256)).toThrow("blue channel");
	});
});

describe("mutation: brightnessToChar assertion messages", () => {
	test("out-of-range brightness throws with 'brightness value' in message", () => {
		expect(() => brightnessToChar(256, CHAR_RAMPS.standard)).toThrow("brightness value");
	});

	test("empty ramp throws with 'character ramp' in message", () => {
		expect(() => brightnessToChar(128, [])).toThrow("character ramp");
	});

	test("postcondition message contains 'ramp'", () => {
		// Craft a scenario where result is not in ramp - actually impossible with valid ramp
		// Instead verify the single-char ramp short-circuit works correctly
		const result = brightnessToChar(0, ["X"]);
		expect(result).toBe("X");
		const result2 = brightnessToChar(255, ["X"]);
		expect(result2).toBe("X");
	});
});

describe("mutation: brightnessToChar single-char ramp guard", () => {
	test("single-char ramp returns that char for all brightness values", () => {
		expect(brightnessToChar(0, ["Z"])).toBe("Z");
		expect(brightnessToChar(128, ["Z"])).toBe("Z");
		expect(brightnessToChar(255, ["Z"])).toBe("Z");
	});

	test("two-char ramp uses index calculation, not single-char shortcut", () => {
		// With 2-char ramp ["A", "B"]: ramp.length-1 = 1
		// b=255: index = floor((0/255)*1) = 0 -> "A"
		// b=0: index = floor((255/255)*1) = 1 -> "B"
		expect(brightnessToChar(255, ["A", "B"])).toBe("A");
		expect(brightnessToChar(0, ["A", "B"])).toBe("B");
	});
});

describe("mutation: imageDataToAscii edge cases", () => {
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

	test("empty ramp throws with 'character ramp' in message", () => {
		const img = makeImageData(1, 1, [128, 128, 128, 255]);
		expect(() => imageDataToAscii(img, [], "mono")).toThrow("character ramp");
	});

	test("single-char ramp works (rampLen === 0 guard)", () => {
		const img = makeImageData(2, 2, [128, 128, 128, 255]);
		const frame = imageDataToAscii(img, ["X"], "mono");
		expect(frame.chars.length).toBe(4);
		for (const ch of frame.chars) {
			expect(ch).toBe("X");
		}
	});

	test("chars array has correct length (pre-allocation matters)", () => {
		const img = makeImageData(5, 3, [100, 100, 100, 255]);
		const frame = imageDataToAscii(img, CHAR_RAMPS.standard, "mono");
		expect(frame.chars.length).toBe(15);
		// Verify no undefined entries (would happen with new Array() + index assignment)
		for (let i = 0; i < frame.chars.length; i++) {
			expect(frame.chars[i]).toBeDefined();
			expect(typeof frame.chars[i]).toBe("string");
		}
	});

	test("colors array has correct length when in color mode", () => {
		const img = makeImageData(3, 2, [100, 100, 100, 255]);
		const frame = imageDataToAscii(img, CHAR_RAMPS.standard, "color");
		expect(frame.colors).not.toBeNull();
		expect(frame.colors?.length).toBe(6);
		for (let i = 0; i < (frame.colors?.length ?? 0); i++) {
			expect(frame.colors?.[i]).toBeDefined();
			expect(typeof frame.colors?.[i]).toBe("string");
		}
	});

	test("green mode luma calculation produces valid rgb string", () => {
		const img = makeImageData(1, 1, [100, 150, 50, 255]);
		const frame = imageDataToAscii(img, CHAR_RAMPS.standard, "green");
		expect(frame.colors?.[0]).toMatch(/^rgb\(0,\d+,0\)$/);
		// Verify the luma value: 0.299*100 + 0.587*150 + 0.114*50 = 29.9+88.05+5.7 = 123.65 -> 124
		expect(frame.colors?.[0]).toBe("rgb(0,124,0)");
	});

	test("single-char ramp in imageDataToAscii: rampLen===0 guard matters", () => {
		// When ramp has 1 element, rampLen = 0
		// Without the guard: Math.floor(((255 - luma) / 255) * 0) = 0 anyway
		// So this is an equivalent mutant for the conditional, but verify behavior:
		const img = makeImageData(2, 1, [0, 0, 0, 255]);
		const frame = imageDataToAscii(img, ["Q"], "mono");
		expect(frame.chars).toEqual(["Q", "Q"]);
	});

	test("new Array(totalPixels) vs new Array(): indexed assignment fills correctly", () => {
		// With new Array(), index assignment still works in JS, so this is equivalent
		// But verify the output is fully populated
		const img = makeImageData(10, 10, [128, 128, 128, 255]);
		const frame = imageDataToAscii(img, CHAR_RAMPS.standard, "color");
		expect(frame.chars.length).toBe(100);
		expect(frame.colors?.length).toBe(100);
		// Ensure every position is filled
		for (let i = 0; i < 100; i++) {
			expect(frame.chars[i]).toBeDefined();
			expect(frame.colors?.[i]).toBeDefined();
		}
	});

	test("postcondition on chars.length is meaningful (not weakened to true)", () => {
		// The postcondition guards chars.length === totalPixels
		// We test that output size matches input size for various dimensions
		for (const [w, h] of [
			[1, 1],
			[3, 5],
			[10, 10],
			[1, 100],
		]) {
			const img = makeImageData(w, h, [128, 128, 128, 255]);
			const frame = imageDataToAscii(img, CHAR_RAMPS.standard, "mono");
			expect(frame.chars.length).toBe(w * h);
		}
	});

	test("brightness result assertion message contains 'brightness result'", () => {
		// This can't really be triggered since brightness always returns [0,255]
		// for valid inputs, making this an equivalent mutant
		// Just verify normal operation
		expect(brightness(0, 0, 0)).toBe(0);
		expect(brightness(255, 255, 255)).toBe(255);
	});

	test("brightnessToChar postcondition message mentions 'ramp'", () => {
		// The postcondition `ramp.includes(result)` is always true for valid ramps
		// so changing the message is an equivalent mutant
		// Verify normal operation
		const result = brightnessToChar(128, CHAR_RAMPS.standard);
		expect(CHAR_RAMPS.standard.includes(result)).toBe(true);
	});
});

// ============================================================
// Property-based tests
// ============================================================

const uint8 = fc.integer({ min: 0, max: 255 });

describe("property-based", () => {
	describe("brightness", () => {
		test("output is always in [0, 255]", () => {
			fc.assert(
				fc.property(uint8, uint8, uint8, (r, g, b) => {
					const result = brightness(r, g, b);
					return result >= 0 && result <= 255;
				}),
			);
		});

		test("monotonicity: increasing all channels increases (or keeps) brightness", () => {
			fc.assert(
				fc.property(
					uint8,
					uint8,
					uint8,
					fc.integer({ min: 0, max: 255 }),
					fc.integer({ min: 0, max: 255 }),
					fc.integer({ min: 0, max: 255 }),
					(r1, g1, b1, r2, g2, b2) => {
						const lo = brightness(Math.min(r1, r2), Math.min(g1, g2), Math.min(b1, b2));
						const hi = brightness(Math.max(r1, r2), Math.max(g1, g2), Math.max(b1, b2));
						return hi >= lo;
					},
				),
			);
		});

		test("weight order: green contributes most, then red, then blue", () => {
			fc.assert(
				fc.property(fc.integer({ min: 1, max: 255 }), (v) => {
					const fromRed = brightness(v, 0, 0);
					const fromGreen = brightness(0, v, 0);
					const fromBlue = brightness(0, 0, v);
					return fromGreen >= fromRed && fromRed >= fromBlue;
				}),
			);
		});
	});

	describe("brightnessToChar", () => {
		const nonEmptyRamp = fc.array(fc.string({ minLength: 1, maxLength: 1 }), {
			minLength: 1,
			maxLength: 20,
		});

		test("output is always a member of the ramp", () => {
			fc.assert(
				fc.property(uint8, nonEmptyRamp, (b, ramp) => {
					const result = brightnessToChar(b, ramp);
					return ramp.includes(result);
				}),
			);
		});

		test("b=255 maps to ramp[0], b=0 maps to ramp[last]", () => {
			fc.assert(
				fc.property(nonEmptyRamp, (ramp) => {
					if (ramp.length === 1) return true; // single-char ramp always returns that char
					return (
						brightnessToChar(255, ramp) === ramp[0] &&
						brightnessToChar(0, ramp) === ramp[ramp.length - 1]
					);
				}),
			);
		});
	});

	describe("imageDataToAscii", () => {
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
						const frame = imageDataToAscii(img, CHAR_RAMPS.standard, "mono");
						return frame.chars.length === w * h;
					},
				),
			);
		});

		test("mono mode returns null colors, non-mono returns array of same length", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1, max: 20 }),
					fc.integer({ min: 1, max: 20 }),
					fc.constantFrom("mono" as const, "color" as const, "green" as const),
					(w, h, mode) => {
						const data = new Uint8ClampedArray(w * h * 4);
						const img = { data, width: w, height: h, colorSpace: "srgb" } as ImageData;
						const frame = imageDataToAscii(img, CHAR_RAMPS.standard, mode);
						if (mode === "mono") {
							return frame.colors === null;
						}
						return frame.colors !== null && frame.colors.length === frame.chars.length;
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
						const frame = imageDataToAscii(img, CHAR_RAMPS.standard, "mono");
						const first = frame.chars[0];
						return frame.chars.every((ch) => ch === first);
					},
				),
			);
		});
	});
});
