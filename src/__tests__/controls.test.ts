import { describe, expect, mock, test } from "bun:test";
import { createControlsPanel, populateCameraList, updateFpsDisplay } from "../controls";
import { createDefaultState } from "../types";

describe("createControlsPanel", () => {
	test("returns an element with id 'controls'", () => {
		const state = createDefaultState();
		const panel = createControlsPanel(state, {
			onStart: () => {},
			onStop: () => {},
			onCameraChange: () => {},
		});
		expect(panel.id).toBe("controls");
	});

	test("contains a start/stop button", () => {
		const state = createDefaultState();
		const panel = createControlsPanel(state, {
			onStart: () => {},
			onStop: () => {},
			onCameraChange: () => {},
		});
		const btn = panel.querySelector("#btn-toggle") as HTMLButtonElement;
		expect(btn).not.toBeNull();
		expect(btn.textContent).toBe("Start");
	});

	test("contains resolution slider", () => {
		const state = createDefaultState();
		const panel = createControlsPanel(state, {
			onStart: () => {},
			onStop: () => {},
			onCameraChange: () => {},
		});
		const slider = panel.querySelector("#slider-columns") as HTMLInputElement;
		expect(slider).not.toBeNull();
		expect(slider.type).toBe("range");
		expect(slider.value).toBe("120");
	});

	test("contains color mode selector", () => {
		const state = createDefaultState();
		const panel = createControlsPanel(state, {
			onStart: () => {},
			onStop: () => {},
			onCameraChange: () => {},
		});
		const select = panel.querySelector("#select-color") as HTMLSelectElement;
		expect(select).not.toBeNull();
	});

	test("contains char set selector", () => {
		const state = createDefaultState();
		const panel = createControlsPanel(state, {
			onStart: () => {},
			onStop: () => {},
			onCameraChange: () => {},
		});
		const select = panel.querySelector("#select-charset") as HTMLSelectElement;
		expect(select).not.toBeNull();
	});

	test("contains mirror checkbox", () => {
		const state = createDefaultState();
		const panel = createControlsPanel(state, {
			onStart: () => {},
			onStop: () => {},
			onCameraChange: () => {},
		});
		const checkbox = panel.querySelector("#check-mirror") as HTMLInputElement;
		expect(checkbox).not.toBeNull();
		expect(checkbox.checked).toBe(true);
	});

	test("toggle button calls onStart", () => {
		const state = createDefaultState();
		const onStart = mock(() => {});
		const panel = createControlsPanel(state, {
			onStart,
			onStop: () => {},
			onCameraChange: () => {},
		});
		const btn = panel.querySelector("#btn-toggle") as HTMLButtonElement;
		btn.click();
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	test("toggle button calls onStop when running", () => {
		const state = createDefaultState();
		state.running = true;
		const onStop = mock(() => {});
		const panel = createControlsPanel(state, {
			onStart: () => {},
			onStop,
			onCameraChange: () => {},
		});
		const btn = panel.querySelector("#btn-toggle") as HTMLButtonElement;
		btn.click();
		expect(onStop).toHaveBeenCalledTimes(1);
	});

	test("resolution slider updates state.width", () => {
		const state = createDefaultState();
		const panel = createControlsPanel(state, {
			onStart: () => {},
			onStop: () => {},
			onCameraChange: () => {},
		});
		const slider = panel.querySelector("#slider-columns") as HTMLInputElement;
		slider.value = "80";
		slider.dispatchEvent(new Event("input"));
		expect(state.width).toBe(80);
	});

	test("font size slider updates state.fontSize", () => {
		const state = createDefaultState();
		const panel = createControlsPanel(state, {
			onStart: () => {},
			onStop: () => {},
			onCameraChange: () => {},
		});
		const slider = panel.querySelector("#slider-fontsize") as HTMLInputElement;
		slider.value = "14";
		slider.dispatchEvent(new Event("input"));
		expect(state.fontSize).toBe(14);
	});

	test("fps slider updates state.targetFps", () => {
		const state = createDefaultState();
		const panel = createControlsPanel(state, {
			onStart: () => {},
			onStop: () => {},
			onCameraChange: () => {},
		});
		const slider = panel.querySelector("#slider-fps") as HTMLInputElement;
		slider.value = "25";
		slider.dispatchEvent(new Event("input"));
		expect(state.targetFps).toBe(25);
	});

	test("color mode select updates state.colorMode", () => {
		const state = createDefaultState();
		const panel = createControlsPanel(state, {
			onStart: () => {},
			onStop: () => {},
			onCameraChange: () => {},
		});
		const select = panel.querySelector("#select-color") as HTMLSelectElement;
		select.value = "green";
		select.dispatchEvent(new Event("change"));
		expect(state.colorMode).toBe("green");
	});

	test("char set select updates state.charSet", () => {
		const state = createDefaultState();
		const panel = createControlsPanel(state, {
			onStart: () => {},
			onStop: () => {},
			onCameraChange: () => {},
		});
		const select = panel.querySelector("#select-charset") as HTMLSelectElement;
		select.value = "blocks";
		select.dispatchEvent(new Event("change"));
		expect(state.charSet).toBe("blocks");
	});

	test("mirror checkbox updates state.flipHorizontal", () => {
		const state = createDefaultState();
		const panel = createControlsPanel(state, {
			onStart: () => {},
			onStop: () => {},
			onCameraChange: () => {},
		});
		const checkbox = panel.querySelector("#check-mirror") as HTMLInputElement;
		checkbox.checked = false;
		checkbox.dispatchEvent(new Event("change"));
		expect(state.flipHorizontal).toBe(false);
	});
});

describe("updateFpsDisplay", () => {
	test("updates fps display element", () => {
		const fpsEl = document.createElement("span");
		fpsEl.id = "fps-display";
		document.body.appendChild(fpsEl);

		updateFpsDisplay(24);
		expect(fpsEl.textContent).toBe("FPS: 24");

		fpsEl.remove();
	});

	test("does nothing when element is missing", () => {
		expect(() => updateFpsDisplay(30)).not.toThrow();
	});
});

describe("populateCameraList", () => {
	test("populates select element with devices", () => {
		const selectEl = document.createElement("select");
		selectEl.id = "select-camera";
		document.body.appendChild(selectEl);

		const devices = [
			{ deviceId: "cam1", label: "Camera 1", kind: "videoinput" },
			{ deviceId: "cam2", label: "Camera 2", kind: "videoinput" },
		] as MediaDeviceInfo[];

		populateCameraList(devices);
		expect(selectEl.options.length).toBe(2);
		expect(selectEl.options[0].value).toBe("cam1");
		expect(selectEl.options[0].textContent).toBe("Camera 1");
		expect(selectEl.options[1].value).toBe("cam2");

		selectEl.remove();
	});

	test("uses default label for unnamed devices", () => {
		const selectEl = document.createElement("select");
		selectEl.id = "select-camera";
		document.body.appendChild(selectEl);

		const devices = [{ deviceId: "cam1", label: "", kind: "videoinput" }] as MediaDeviceInfo[];

		populateCameraList(devices);
		expect(selectEl.options[0].textContent).toBe("Camera 1");

		selectEl.remove();
	});

	test("does nothing when select element is missing", () => {
		expect(() => populateCameraList([])).not.toThrow();
	});

	test("clears existing options before populating", () => {
		const selectEl = document.createElement("select");
		selectEl.id = "select-camera";
		selectEl.innerHTML = '<option value="old">Old Camera</option>';
		document.body.appendChild(selectEl);

		const devices = [
			{ deviceId: "cam1", label: "New Camera", kind: "videoinput" },
		] as MediaDeviceInfo[];

		populateCameraList(devices);
		expect(selectEl.options.length).toBe(1);
		expect(selectEl.options[0].value).toBe("cam1");

		selectEl.remove();
	});
});
