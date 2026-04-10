import { describe, expect, test } from "bun:test";
import { cameraErrorMessage, createState } from "../main";

describe("createState", () => {
	test("returns initial state", () => {
		const state = createState();
		expect(state.running).toBe(false);
		expect(state.width).toBe(80);
		expect(state.height).toBe(40);
		expect(state.stream).toBeNull();
	});
});

describe("cameraErrorMessage", () => {
	test("returns denied message for NotAllowedError", () => {
		const err = new DOMException("", "NotAllowedError");
		expect(cameraErrorMessage(err)).toBe("camera access was denied");
	});

	test("returns not found message for NotFoundError", () => {
		const err = new DOMException("", "NotFoundError");
		expect(cameraErrorMessage(err)).toBe("no camera found");
	});

	test("returns in-use message for NotReadableError", () => {
		const err = new DOMException("", "NotReadableError");
		expect(cameraErrorMessage(err)).toBe("camera is in use by another app");
	});

	test("returns generic message for unknown DOMException", () => {
		const err = new DOMException("something", "AbortError");
		expect(cameraErrorMessage(err)).toContain("camera error");
	});

	test("returns generic message for Error", () => {
		const err = new Error("oops");
		expect(cameraErrorMessage(err)).toBe("camera error: oops");
	});

	test("handles non-Error values", () => {
		expect(cameraErrorMessage("string error")).toBe("camera error: string error");
	});
});
