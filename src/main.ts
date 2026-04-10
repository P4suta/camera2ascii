import { captureFrame, startCamera } from "./camera";
import { imageDataToAscii, RAMP } from "./converter";
import { type CellMetrics, calcGridSize, measureCell, renderFrame } from "./renderer";
import { injectStyles } from "./styles";
import type { AppState } from "./types";

function createState(): AppState {
	return {
		running: false,
		width: 80,
		height: 40,
		stream: null,
	};
}

function cameraErrorMessage(err: unknown): string {
	if (err instanceof DOMException) {
		switch (err.name) {
			case "NotAllowedError":
				return "camera access was denied";
			case "NotFoundError":
				return "no camera found";
			case "NotReadableError":
				return "camera is in use by another app";
		}
	}
	return `camera error: ${err instanceof Error ? err.message : String(err)}`;
}

function showToast(message: string): void {
	const toast = document.getElementById("toast");
	if (!toast) return;
	toast.textContent = message;
	toast.classList.add("visible");
	setTimeout(() => toast.classList.remove("visible"), 4000);
}

function hidePrompt(): void {
	const prompt = document.getElementById("prompt");
	if (prompt) prompt.classList.add("hidden");
}

function updateGridSize(
	state: AppState,
	displayCanvas: HTMLCanvasElement,
	cell: CellMetrics,
	video: HTMLVideoElement,
): void {
	displayCanvas.width = window.innerWidth;
	displayCanvas.height = window.innerHeight;

	const { cols, rows } = calcGridSize(displayCanvas.width, displayCanvas.height, cell);
	state.width = cols;

	const videoWidth = video.videoWidth || 640;
	const videoHeight = video.videoHeight || 480;
	state.height = Math.min(rows, Math.round(cols * (videoHeight / videoWidth) * 0.5));
}

function startRenderLoop(
	state: AppState,
	video: HTMLVideoElement,
	captureCanvas: HTMLCanvasElement,
	displayCanvas: HTMLCanvasElement,
	cell: CellMetrics,
): void {
	const captureCtx = captureCanvas.getContext("2d");
	const displayCtx = displayCanvas.getContext("2d");
	if (!captureCtx || !displayCtx) return;

	const loop = () => {
		if (!state.running) return;

		captureCanvas.width = state.width;
		captureCanvas.height = state.height;

		const imageData = captureFrame(video, captureCtx, state.width, state.height, true);
		const frame = imageDataToAscii(imageData, RAMP);

		renderFrame(displayCtx, frame, state.width, cell, displayCanvas.width, displayCanvas.height);

		requestAnimationFrame(loop);
	};

	requestAnimationFrame(loop);
}

async function init(): Promise<void> {
	injectStyles();

	const state = createState();

	const displayCanvas = document.createElement("canvas");
	displayCanvas.id = "display";

	const captureCanvas = document.createElement("canvas");
	const video = document.createElement("video");
	video.id = "video-capture";
	video.playsInline = true;
	video.muted = true;

	const prompt = document.createElement("div");
	prompt.id = "prompt";
	const promptText = document.createElement("span");
	promptText.textContent = "camera access required";
	prompt.appendChild(promptText);

	const toast = document.createElement("div");
	toast.id = "toast";

	document.body.appendChild(displayCanvas);
	document.body.appendChild(video);
	document.body.appendChild(prompt);
	document.body.appendChild(toast);

	// Measure cell metrics
	const tempCtx = displayCanvas.getContext("2d");
	if (!tempCtx) return;
	displayCanvas.width = window.innerWidth;
	displayCanvas.height = window.innerHeight;
	const cell = measureCell(tempCtx);

	try {
		state.stream = await startCamera(video);
		state.running = true;

		updateGridSize(state, displayCanvas, cell, video);

		window.addEventListener("resize", () => {
			updateGridSize(state, displayCanvas, cell, video);
		});

		hidePrompt();
		startRenderLoop(state, video, captureCanvas, displayCanvas, cell);
	} catch (err) {
		hidePrompt();
		showToast(cameraErrorMessage(err));
	}
}

if (typeof window !== "undefined" && typeof Bun === "undefined") {
	init();
}

export { cameraErrorMessage, createState, hidePrompt, init, showToast, updateGridSize };
