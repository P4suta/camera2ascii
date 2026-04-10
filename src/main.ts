import { assertPositive } from "./assert";
import { captureFrame, listCameras, startCamera, stopCamera } from "./camera";
import { createControlsPanel, populateCameraList, updateFpsDisplay } from "./controls";
import { CHAR_RAMPS, imageDataToAscii } from "./converter";
import { el } from "./dom";
import { createOutputElement, renderFrame } from "./renderer";
import { injectStyles } from "./styles";
import { type AppState, createDefaultState } from "./types";

export function showError(message: string): void {
	const banner = document.getElementById("error-banner");
	if (banner) {
		banner.textContent = message;
		banner.style.display = "block";
	}
}

export function hideError(): void {
	const banner = document.getElementById("error-banner");
	if (banner) {
		banner.style.display = "none";
	}
}

export function cameraErrorMessage(err: unknown): string {
	if (err instanceof DOMException) {
		switch (err.name) {
			case "NotAllowedError":
				return "Camera access denied. Please allow camera access in your browser settings.";
			case "NotFoundError":
				return "No camera detected. Please connect a camera.";
			case "NotReadableError":
				return "Camera is in use by another application.";
		}
	}
	return `Camera error: ${err instanceof Error ? err.message : String(err)}`;
}

export function handleStop(state: AppState): void {
	state.running = false;
	if (state.stream) {
		stopCamera(state.stream);
		state.stream = null;
	}
}

export function processFrame(
	state: AppState,
	video: HTMLVideoElement,
	ctx: CanvasRenderingContext2D,
	canvas: HTMLCanvasElement,
	output: HTMLPreElement,
): void {
	assertPositive(state.width, "processFrame width");
	assertPositive(state.height, "processFrame height");

	canvas.width = state.width;
	canvas.height = state.height;

	const imageData = captureFrame(video, ctx, state.width, state.height, state.flipHorizontal);
	const ramp =
		state.charSet === "custom" && state.customRamp.length >= 2
			? [...state.customRamp]
			: (CHAR_RAMPS[state.charSet] ?? CHAR_RAMPS.standard);
	const frame = imageDataToAscii(imageData, ramp, state.colorMode);

	output.style.fontSize = `${state.fontSize}px`;
	renderFrame(output, frame, state.width, state.colorMode);
}

export function buildApp(): {
	state: AppState;
	output: HTMLPreElement;
	video: HTMLVideoElement;
	canvas: HTMLCanvasElement;
} {
	injectStyles();

	const state = createDefaultState();
	const output = createOutputElement();
	const video = el("video", {
		id: "video-capture",
		playsinline: "",
		muted: "",
	}) as unknown as HTMLVideoElement;
	const canvas = el("canvas") as unknown as HTMLCanvasElement;
	const errorBanner = el("div", { id: "error-banner" });

	canvas.width = state.width;
	canvas.height = state.height;

	const onStart = async () => {
		try {
			hideError();
			state.stream = await startCamera(video, state.selectedDeviceId ?? undefined);
			state.running = true;

			const videoWidth = (video as HTMLVideoElement).videoWidth || 640;
			const videoHeight = (video as HTMLVideoElement).videoHeight || 480;
			state.height = Math.round(state.width * (videoHeight / videoWidth) * 0.5);
			canvas.width = state.width;
			canvas.height = state.height;

			const cameras = await listCameras();
			populateCameraList(cameras);

			startRenderLoop(state, video as HTMLVideoElement, canvas, output);
		} catch (err) {
			showError(cameraErrorMessage(err));
		}
	};

	const onStop = () => handleStop(state);

	const onCameraChange = async (deviceId: string) => {
		state.selectedDeviceId = deviceId;
		if (state.running) {
			handleStop(state);
			await onStart();
		}
	};

	const controls = createControlsPanel(state, { onStart, onStop, onCameraChange });

	const app = el("div", { id: "app" }, [output, controls]);
	document.body.appendChild(errorBanner);
	document.body.appendChild(video as unknown as Node);
	document.body.appendChild(app);

	return { state, output, video: video as HTMLVideoElement, canvas };
}

export function startRenderLoop(
	state: AppState,
	video: HTMLVideoElement,
	canvas: HTMLCanvasElement,
	output: HTMLPreElement,
): void {
	let lastFrameTime = 0;
	let frameCount = 0;
	let fpsLastUpdate = performance.now();

	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	const loop = (now: number) => {
		if (!state.running) return;

		const interval = 1000 / state.targetFps;
		const elapsed = now - lastFrameTime;

		if (elapsed >= interval) {
			processFrame(state, video, ctx, canvas, output);

			frameCount++;
			if (now - fpsLastUpdate >= 1000) {
				state.currentFps = frameCount;
				updateFpsDisplay(frameCount);
				frameCount = 0;
				fpsLastUpdate = now;
			}
			lastFrameTime = now - (elapsed % interval);
		}

		requestAnimationFrame(loop);
	};

	requestAnimationFrame(loop);
}

if (typeof window !== "undefined" && typeof Bun === "undefined") {
	buildApp();
}
