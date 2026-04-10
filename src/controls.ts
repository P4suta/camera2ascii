import { el } from "./dom";
import type { AppState, CharSetName, ColorMode } from "./types";

interface ControlCallbacks {
	onStart: () => void;
	onStop: () => void;
	onCameraChange: (deviceId: string) => void;
}

function slider(
	id: string,
	label: string,
	min: number,
	max: number,
	value: number,
	onChange: (v: number) => void,
): HTMLElement {
	const valueDisplay = el("span", { class: "value-display" }, [String(value)]);
	const input = el("input", {
		type: "range",
		id,
		min: String(min),
		max: String(max),
		value: String(value),
	});
	input.addEventListener("input", () => {
		const v = Number(input.value);
		valueDisplay.textContent = String(v);
		onChange(v);
	});

	return el("div", { class: "control-group" }, [el("label", {}, [label]), input, valueDisplay]);
}

function select(
	id: string,
	label: string,
	options: { value: string; label: string }[],
	value: string,
	onChange: (v: string) => void,
): HTMLElement {
	const selectEl = el("select", { id });
	for (const opt of options) {
		const optEl = el("option", { value: opt.value }, [opt.label]);
		if (opt.value === value) optEl.selected = true;
		selectEl.appendChild(optEl);
	}
	selectEl.addEventListener("change", () => onChange(selectEl.value));

	return el("div", { class: "control-group" }, [el("label", {}, [label]), selectEl]);
}

export function createControlsPanel(state: AppState, callbacks: ControlCallbacks): HTMLElement {
	const toggleBtn = el("button", { id: "btn-toggle" }, [state.running ? "Stop" : "Start"]);
	if (state.running) toggleBtn.classList.add("active");

	toggleBtn.addEventListener("click", () => {
		if (state.running) {
			callbacks.onStop();
			toggleBtn.textContent = "Start";
			toggleBtn.classList.remove("active");
		} else {
			callbacks.onStart();
			toggleBtn.textContent = "Stop";
			toggleBtn.classList.add("active");
		}
	});

	const cameraSelect = select("select-camera", "Camera", [], "", (v) =>
		callbacks.onCameraChange(v),
	);

	const columnsSlider = slider("slider-columns", "Columns", 40, 200, state.width, (v) => {
		state.width = v;
	});

	const fontSlider = slider("slider-fontsize", "Font Size", 6, 16, state.fontSize, (v) => {
		state.fontSize = v;
	});

	const fpsSlider = slider("slider-fps", "Target FPS", 5, 30, state.targetFps, (v) => {
		state.targetFps = v;
	});

	const charSetSelect = select(
		"select-charset",
		"Character Set",
		[
			{ value: "standard", label: "Standard" },
			{ value: "detailed", label: "Detailed" },
			{ value: "blocks", label: "Blocks" },
			{ value: "minimal", label: "Minimal" },
		],
		state.charSet,
		(v) => {
			state.charSet = v as CharSetName;
		},
	);

	const colorSelect = select(
		"select-color",
		"Color Mode",
		[
			{ value: "mono", label: "Monochrome" },
			{ value: "color", label: "Color" },
			{ value: "green", label: "Green Terminal" },
		],
		state.colorMode,
		(v) => {
			state.colorMode = v as ColorMode;
		},
	);

	const mirrorCheckbox = el("input", { type: "checkbox", id: "check-mirror" }) as HTMLInputElement;
	mirrorCheckbox.checked = state.flipHorizontal;
	mirrorCheckbox.addEventListener("change", () => {
		state.flipHorizontal = mirrorCheckbox.checked;
	});

	const mirrorGroup = el("div", { class: "checkbox-group" }, [
		mirrorCheckbox,
		el("label", {}, ["Mirror"]),
	]);

	const fpsDisplay = el("span", { id: "fps-display" }, ["FPS: 0"]);

	const panel = el("div", { id: "controls" }, [
		el("h1", {}, ["camera2ascii"]),
		toggleBtn,
		cameraSelect,
		columnsSlider,
		fontSlider,
		fpsSlider,
		charSetSelect,
		colorSelect,
		mirrorGroup,
		fpsDisplay,
	]);

	return panel;
}

export function updateFpsDisplay(fps: number): void {
	const el = document.getElementById("fps-display");
	if (el) el.textContent = `FPS: ${fps}`;
}

export function populateCameraList(devices: MediaDeviceInfo[]): void {
	const selectEl = document.getElementById("select-camera") as HTMLSelectElement | null;
	if (!selectEl) return;

	while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);
	for (const device of devices) {
		const opt = document.createElement("option");
		opt.value = device.deviceId;
		opt.textContent = device.label || `Camera ${selectEl.options.length + 1}`;
		selectEl.appendChild(opt);
	}
}
