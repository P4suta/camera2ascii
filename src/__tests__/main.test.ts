import { afterEach, describe, expect, mock, test } from "bun:test";
import {
	buildApp,
	cameraErrorMessage,
	handleStop,
	hideError,
	processFrame,
	showError,
	startRenderLoop,
} from "../main";
import { createDefaultState } from "../types";

function cleanup() {
	for (const id of ["app", "error-banner", "video-capture", "camera2ascii-styles"]) {
		document.getElementById(id)?.remove();
	}
}

describe("buildApp", () => {
	afterEach(cleanup);

	test("creates app container in body", () => {
		buildApp();
		expect(document.getElementById("app")).not.toBeNull();
	});

	test("creates ascii output element", () => {
		buildApp();
		const output = document.getElementById("ascii-output");
		expect(output).not.toBeNull();
		expect(output?.tagName).toBe("PRE");
	});

	test("creates controls panel", () => {
		buildApp();
		expect(document.getElementById("controls")).not.toBeNull();
	});

	test("creates hidden video element", () => {
		buildApp();
		expect(document.getElementById("video-capture")).not.toBeNull();
	});

	test("creates error banner", () => {
		buildApp();
		expect(document.getElementById("error-banner")).not.toBeNull();
	});

	test("returns state, output, video, canvas", () => {
		const result = buildApp();
		expect(result.state).toBeDefined();
		expect(result.state.running).toBe(false);
		expect(result.output).toBeDefined();
		expect(result.video).toBeDefined();
		expect(result.canvas).toBeDefined();
	});

	test("canvas dimensions match default state", () => {
		const { canvas, state } = buildApp();
		expect(canvas.width).toBe(state.width);
		expect(canvas.height).toBe(state.height);
	});

	test("injects styles", () => {
		buildApp();
		expect(document.getElementById("camera2ascii-styles")).not.toBeNull();
	});
});

describe("showError", () => {
	afterEach(cleanup);

	test("sets text on banner", () => {
		buildApp();
		showError("Test error");
		const banner = document.getElementById("error-banner");
		expect(banner?.textContent).toBe("Test error");
	});

	test("does nothing when banner is missing", () => {
		expect(() => showError("No banner")).not.toThrow();
	});
});

describe("hideError", () => {
	afterEach(cleanup);

	test("sets display none on banner", () => {
		buildApp();
		showError("visible");
		hideError();
		const banner = document.getElementById("error-banner");
		expect(banner?.style.display).toBe("none");
	});

	test("does nothing when banner is missing", () => {
		expect(() => hideError()).not.toThrow();
	});
});

describe("cameraErrorMessage", () => {
	test("returns NotAllowedError message", () => {
		const err = new DOMException("", "NotAllowedError");
		expect(cameraErrorMessage(err)).toContain("denied");
	});

	test("returns NotFoundError message", () => {
		const err = new DOMException("", "NotFoundError");
		expect(cameraErrorMessage(err)).toContain("No camera");
	});

	test("returns NotReadableError message", () => {
		const err = new DOMException("", "NotReadableError");
		expect(cameraErrorMessage(err)).toContain("in use");
	});

	test("returns generic DOMException message", () => {
		const err = new DOMException("something", "AbortError");
		expect(cameraErrorMessage(err)).toContain("Camera error");
	});

	test("returns generic Error message", () => {
		const err = new Error("oops");
		expect(cameraErrorMessage(err)).toBe("Camera error: oops");
	});

	test("handles non-Error values", () => {
		expect(cameraErrorMessage("string error")).toBe("Camera error: string error");
	});
});

describe("handleStop", () => {
	test("sets running to false", () => {
		const state = createDefaultState();
		state.running = true;
		handleStop(state);
		expect(state.running).toBe(false);
	});

	test("stops and clears stream", () => {
		const state = createDefaultState();
		state.running = true;
		const stopFn = mock(() => {});
		state.stream = { getTracks: () => [{ stop: stopFn }] } as unknown as MediaStream;
		handleStop(state);
		expect(state.stream).toBeNull();
		expect(stopFn).toHaveBeenCalledTimes(1);
	});

	test("does nothing when stream is null", () => {
		const state = createDefaultState();
		state.running = true;
		state.stream = null;
		handleStop(state);
		expect(state.running).toBe(false);
		expect(state.stream).toBeNull();
	});
});

describe("processFrame", () => {
	test("processes frame with mocked context", () => {
		const state = createDefaultState();
		state.width = 4;
		state.height = 3;

		const pixelData = new Uint8ClampedArray(4 * 3 * 4);
		const imageData = { data: pixelData, width: 4, height: 3, colorSpace: "srgb" as const };

		const ctx = {
			save: mock(() => {}),
			restore: mock(() => {}),
			scale: mock(() => {}),
			drawImage: mock(() => {}),
			getImageData: mock(() => imageData),
		} as unknown as CanvasRenderingContext2D;

		const canvas = { width: 0, height: 0 } as HTMLCanvasElement;
		const output = document.createElement("pre") as HTMLPreElement;
		const video = {} as HTMLVideoElement;

		processFrame(state, video, ctx, canvas, output);

		expect(canvas.width).toBe(4);
		expect(canvas.height).toBe(3);
		expect(output.textContent).toBeDefined();
		expect(ctx.getImageData).toHaveBeenCalledTimes(1);
	});

	test("uses fallback ramp for unknown charSet", () => {
		const state = createDefaultState();
		state.width = 2;
		state.height = 1;
		state.charSet = "nonexistent" as unknown as typeof state.charSet;

		const pixelData = new Uint8ClampedArray(2 * 1 * 4);
		const imageData = { data: pixelData, width: 2, height: 1, colorSpace: "srgb" as const };

		const ctx = {
			save: mock(() => {}),
			restore: mock(() => {}),
			scale: mock(() => {}),
			drawImage: mock(() => {}),
			getImageData: mock(() => imageData),
		} as unknown as CanvasRenderingContext2D;

		const canvas = { width: 0, height: 0 } as HTMLCanvasElement;
		const output = document.createElement("pre") as HTMLPreElement;
		const video = {} as HTMLVideoElement;

		expect(() => processFrame(state, video, ctx, canvas, output)).not.toThrow();
	});
});

describe("startRenderLoop", () => {
	test("does not throw when ctx is null", () => {
		const state = createDefaultState();
		state.running = true;

		const canvas = document.createElement("canvas");
		const origGetContext = canvas.getContext;
		canvas.getContext = (() => null) as typeof canvas.getContext;

		const output = document.createElement("pre") as HTMLPreElement;
		const video = document.createElement("video") as HTMLVideoElement;

		expect(() => startRenderLoop(state, video, canvas, output)).not.toThrow();
		canvas.getContext = origGetContext;
	});
});
