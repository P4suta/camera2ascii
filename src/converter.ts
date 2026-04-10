import { assertNonEmpty, postcondition } from "./assert";
import { DENSITY_RAMP_HALF } from "./generated/charmap";
import type { AsciiFrame, CharRamp } from "./types";

export const RAMP: CharRamp = DENSITY_RAMP_HALF;

export function imageDataToAscii(imageData: ImageData, ramp: CharRamp): AsciiFrame {
	assertNonEmpty(ramp, "character ramp");

	const { data, width, height } = imageData;
	const totalPixels = width * height;
	const chars: string[] = new Array(totalPixels);
	const rampLen = ramp.length - 1;

	for (let i = 0; i < totalPixels; i++) {
		const offset = i * 4;
		const r = data[offset];
		const g = data[offset + 1];
		const b = data[offset + 2];
		const luma = 0.299 * r + 0.587 * g + 0.114 * b;

		const charIndex = rampLen === 0 ? 0 : Math.floor(((255 - luma) / 255) * rampLen);
		chars[i] = ramp[charIndex];
	}

	postcondition(
		chars.length === totalPixels,
		`chars.length (${chars.length}) must equal totalPixels (${totalPixels})`,
	);
	return { chars };
}
