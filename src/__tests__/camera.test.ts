import { describe, expect, mock, test } from "bun:test";
import { captureFrame, listCameras, startCamera, stopCamera } from "../camera";

describe("stopCamera", () => {
	test("stops all tracks on the stream", () => {
		const stopFn = mock(() => {});
		const stream = {
			getTracks: () => [{ stop: stopFn }, { stop: stopFn }],
		} as unknown as MediaStream;

		stopCamera(stream);
		expect(stopFn).toHaveBeenCalledTimes(2);
	});
});

describe("captureFrame", () => {
	test("returns ImageData with correct dimensions", () => {
		const width = 10;
		const height = 8;
		const pixelData = new Uint8ClampedArray(width * height * 4);
		const imageData = { data: pixelData, width, height, colorSpace: "srgb" as const };

		const ctx = {
			save: mock(() => {}),
			restore: mock(() => {}),
			scale: mock(() => {}),
			drawImage: mock(() => {}),
			getImageData: mock(() => imageData),
		} as unknown as CanvasRenderingContext2D;

		const video = {} as HTMLVideoElement;
		const result = captureFrame(video, ctx, width, height, false);

		expect(result.width).toBe(width);
		expect(result.height).toBe(height);
		expect(ctx.drawImage).toHaveBeenCalledTimes(1);
		expect(ctx.save).toHaveBeenCalledTimes(1);
		expect(ctx.restore).toHaveBeenCalledTimes(1);
	});

	test("applies horizontal flip when requested", () => {
		const width = 10;
		const height = 8;
		const pixelData = new Uint8ClampedArray(width * height * 4);
		const imageData = { data: pixelData, width, height, colorSpace: "srgb" as const };

		const ctx = {
			save: mock(() => {}),
			restore: mock(() => {}),
			scale: mock((_x: number, _y: number) => {}),
			drawImage: mock(() => {}),
			getImageData: mock(() => imageData),
		} as unknown as CanvasRenderingContext2D;

		const video = {} as HTMLVideoElement;
		captureFrame(video, ctx, width, height, true);

		expect(ctx.scale).toHaveBeenCalledWith(-1, 1);
	});

	test("does not flip when flipHorizontal is false", () => {
		const width = 10;
		const height = 8;
		const pixelData = new Uint8ClampedArray(width * height * 4);
		const imageData = { data: pixelData, width, height, colorSpace: "srgb" as const };

		const ctx = {
			save: mock(() => {}),
			restore: mock(() => {}),
			scale: mock(() => {}),
			drawImage: mock(() => {}),
			getImageData: mock(() => imageData),
		} as unknown as CanvasRenderingContext2D;

		const video = {} as HTMLVideoElement;
		captureFrame(video, ctx, width, height, false);

		expect(ctx.scale).not.toHaveBeenCalled();
	});

	test("draws at negative x when flipped", () => {
		const width = 10;
		const height = 8;
		const pixelData = new Uint8ClampedArray(width * height * 4);
		const imageData = { data: pixelData, width, height, colorSpace: "srgb" as const };

		const ctx = {
			save: mock(() => {}),
			restore: mock(() => {}),
			scale: mock(() => {}),
			drawImage: mock((..._args: unknown[]) => {}),
			getImageData: mock(() => imageData),
		} as unknown as CanvasRenderingContext2D;

		const video = {} as HTMLVideoElement;
		captureFrame(video, ctx, width, height, true);

		expect(ctx.drawImage).toHaveBeenCalledWith(video, -width, 0, width, height);
	});

	test("draws at origin when not flipped", () => {
		const width = 10;
		const height = 8;
		const pixelData = new Uint8ClampedArray(width * height * 4);
		const imageData = { data: pixelData, width, height, colorSpace: "srgb" as const };

		const ctx = {
			save: mock(() => {}),
			restore: mock(() => {}),
			scale: mock(() => {}),
			drawImage: mock((..._args: unknown[]) => {}),
			getImageData: mock(() => imageData),
		} as unknown as CanvasRenderingContext2D;

		const video = {} as HTMLVideoElement;
		captureFrame(video, ctx, width, height, false);

		expect(ctx.drawImage).toHaveBeenCalledWith(video, 0, 0, width, height);
	});
});

describe("startCamera", () => {
	test("calls getUserMedia and sets video src", async () => {
		const mockStream = {
			getTracks: () => [],
		} as unknown as MediaStream;

		const mockVideo = {
			srcObject: null as MediaStream | null,
			play: mock(async () => {}),
			addEventListener: mock((event: string, handler: () => void) => {
				if (event === "loadedmetadata") handler();
			}),
		} as unknown as HTMLVideoElement;

		const _originalGetUserMedia = navigator.mediaDevices?.getUserMedia;
		Object.defineProperty(navigator, "mediaDevices", {
			value: {
				getUserMedia: mock(async () => mockStream),
				enumerateDevices: mock(async () => []),
			},
			configurable: true,
		});

		const result = await startCamera(mockVideo);
		expect(result).toBe(mockStream);
		expect(mockVideo.srcObject).toBe(mockStream);
	});
});

describe("listCameras", () => {
	test("filters video input devices", async () => {
		const devices = [
			{ kind: "videoinput", deviceId: "cam1", label: "Camera 1" },
			{ kind: "audioinput", deviceId: "mic1", label: "Mic 1" },
			{ kind: "videoinput", deviceId: "cam2", label: "Camera 2" },
		] as MediaDeviceInfo[];

		Object.defineProperty(navigator, "mediaDevices", {
			value: {
				enumerateDevices: mock(async () => devices),
			},
			configurable: true,
		});

		const cameras = await listCameras();
		expect(cameras.length).toBe(2);
		expect(cameras[0].deviceId).toBe("cam1");
		expect(cameras[1].deviceId).toBe("cam2");
	});
});
