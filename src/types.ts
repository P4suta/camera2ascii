export interface AppState {
	running: boolean;
	width: number;
	height: number;
	targetFps: number;
	colorMode: ColorMode;
	charSet: CharSetName;
	customRamp: string;
	flipHorizontal: boolean;
	fontSize: number;
	currentFps: number;
	stream: MediaStream | null;
	selectedDeviceId: string | null;
}

export interface AsciiFrame {
	chars: string[];
	colors: string[] | null;
}

export type CharRamp = readonly string[];

export type ColorMode = "mono" | "color" | "green";

export type CharSetName =
	| "standard"
	| "detailed"
	| "blocks"
	| "minimal"
	| "braille"
	| "kanji"
	| "geometric"
	| "shade"
	| "box"
	| "unicode"
	| "custom";

import { assertPositive, postcondition } from "./assert";

export function createDefaultState(): AppState {
	const state: AppState = {
		running: false,
		width: 120,
		height: 60,
		targetFps: 15,
		colorMode: "mono",
		charSet: "standard",
		customRamp: "",
		flipHorizontal: true,
		fontSize: 10,
		currentFps: 0,
		stream: null,
		selectedDeviceId: null,
	};

	assertPositive(state.width, "default width");
	assertPositive(state.height, "default height");
	assertPositive(state.targetFps, "default targetFps");
	assertPositive(state.fontSize, "default fontSize");
	postcondition(state.currentFps >= 0, "currentFps must be non-negative");

	return state;
}
