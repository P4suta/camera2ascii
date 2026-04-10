import { assertPositive } from "./assert";

export async function startCamera(
	video: HTMLVideoElement,
	deviceId?: string,
): Promise<MediaStream> {
	const constraints: MediaStreamConstraints = {
		video: {
			deviceId: deviceId ? { exact: deviceId } : undefined,
			facingMode: deviceId ? undefined : "user",
		},
	};

	const stream = await navigator.mediaDevices.getUserMedia(constraints);
	video.srcObject = stream;

	await new Promise<void>((resolve) => {
		video.addEventListener("loadedmetadata", () => resolve(), { once: true });
	});

	await video.play();
	return stream;
}

export function stopCamera(stream: MediaStream): void {
	for (const track of stream.getTracks()) {
		track.stop();
	}
}

export async function listCameras(): Promise<MediaDeviceInfo[]> {
	const devices = await navigator.mediaDevices.enumerateDevices();
	return devices.filter((d) => d.kind === "videoinput");
}

export function captureFrame(
	video: HTMLVideoElement,
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	flipHorizontal: boolean,
): ImageData {
	assertPositive(width, "capture width");
	assertPositive(height, "capture height");

	ctx.save();
	if (flipHorizontal) {
		ctx.scale(-1, 1);
		ctx.drawImage(video, -width, 0, width, height);
	} else {
		ctx.drawImage(video, 0, 0, width, height);
	}
	ctx.restore();
	return ctx.getImageData(0, 0, width, height);
}
