import { assertInRange, assertNonEmpty, postcondition } from "./assert";
import type { AsciiFrame, CharRamp, ColorMode } from "./types";

export const CHAR_RAMPS: Record<string, CharRamp> = {
	standard: [..."@%#*+=-:. "],
	detailed: [..."$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. "],
	blocks: [..."█▓▒░ "],
	minimal: [..."@#:. "],
};

export function brightness(r: number, g: number, b: number): number {
	assertInRange(r, 0, 255, "red channel");
	assertInRange(g, 0, 255, "green channel");
	assertInRange(b, 0, 255, "blue channel");

	const result = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

	assertInRange(result, 0, 255, "brightness result");
	return result;
}

export function brightnessToChar(b: number, ramp: CharRamp): string {
	assertInRange(b, 0, 255, "brightness value");
	assertNonEmpty(ramp, "character ramp");

	if (ramp.length === 1) return ramp[0];
	const index = Math.floor(((255 - b) / 255) * (ramp.length - 1));
	const result = ramp[index];

	postcondition(ramp.includes(result), "result character must be in ramp");
	return result;
}

export function imageDataToAscii(
	imageData: ImageData,
	ramp: CharRamp,
	colorMode: ColorMode,
): AsciiFrame {
	assertNonEmpty(ramp, "character ramp");

	const { data, width, height } = imageData;
	const totalPixels = width * height;
	const chars: string[] = new Array(totalPixels);
	const colors: string[] | null = colorMode !== "mono" ? new Array(totalPixels) : null;
	const rampLen = ramp.length - 1;

	for (let i = 0; i < totalPixels; i++) {
		const offset = i * 4;
		const r = data[offset];
		const g = data[offset + 1];
		const b = data[offset + 2];
		const luma = 0.299 * r + 0.587 * g + 0.114 * b;

		const charIndex = rampLen === 0 ? 0 : Math.floor(((255 - luma) / 255) * rampLen);
		chars[i] = ramp[charIndex];

		if (colors) {
			colors[i] = colorMode === "color" ? `rgb(${r},${g},${b})` : `rgb(0,${Math.round(luma)},0)`;
		}
	}

	postcondition(
		chars.length === totalPixels,
		`chars.length (${chars.length}) must equal totalPixels (${totalPixels})`,
	);
	return { chars, colors };
}
