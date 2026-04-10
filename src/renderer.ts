import { assertNonEmpty, assertPositive, postcondition } from "./assert";
import type { AsciiFrame, ColorMode } from "./types";

export function createOutputElement(): HTMLPreElement {
	const pre = document.createElement("pre");
	pre.id = "ascii-output";

	postcondition(pre.tagName === "PRE", "created element must be a PRE");
	return pre;
}

const ESCAPE_MAP: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
};

function escapeHtml(ch: string): string {
	return ESCAPE_MAP[ch] ?? ch;
}

const RGB_PATTERN = /^rgb\(\d{1,3},\d{1,3},\d{1,3}\)$/;

function sanitizeColor(color: string): string {
	return RGB_PATTERN.test(color) ? color : "rgb(128,128,128)";
}

export function renderFrame(
	output: HTMLPreElement,
	frame: AsciiFrame,
	width: number,
	colorMode: ColorMode,
): void {
	assertNonEmpty(frame.chars, "frame chars");
	assertPositive(width, "render width");

	const { chars, colors } = frame;
	const len = chars.length;

	if (colorMode === "mono") {
		const parts: string[] = [];
		for (let i = 0; i < len; i++) {
			parts.push(chars[i]);
			if ((i + 1) % width === 0 && i < len - 1) {
				parts.push("\n");
			}
		}
		output.textContent = parts.join("");
	} else {
		const parts: string[] = [];
		for (let i = 0; i < len; i++) {
			const ch = chars[i] === " " ? "&nbsp;" : escapeHtml(chars[i]);
			parts.push(
				`<span style="color:${sanitizeColor(colors?.[i] ?? "rgb(128,128,128)")}">${ch}</span>`,
			);
			if ((i + 1) % width === 0 && i < len - 1) {
				parts.push("<br>");
			}
		}
		output.innerHTML = parts.join("");
	}
}
