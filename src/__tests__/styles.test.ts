import { afterEach, describe, expect, test } from "bun:test";
import { injectStyles } from "../styles";

describe("injectStyles", () => {
	afterEach(() => {
		const styleEl = document.getElementById("camera2ascii-styles");
		if (styleEl) styleEl.remove();
	});

	test("injects a style element into head", () => {
		injectStyles();
		const styleEl = document.getElementById("camera2ascii-styles");
		expect(styleEl).not.toBeNull();
		expect(styleEl?.tagName).toBe("STYLE");
	});

	test("style contains black background", () => {
		injectStyles();
		const styleEl = document.getElementById("camera2ascii-styles");
		expect(styleEl?.textContent).toContain("#000");
	});

	test("style contains monospace font", () => {
		injectStyles();
		const styleEl = document.getElementById("camera2ascii-styles");
		expect(styleEl?.textContent).toContain("monospace");
	});

	test("does not inject twice", () => {
		injectStyles();
		injectStyles();
		const styles = document.querySelectorAll("#camera2ascii-styles");
		expect(styles.length).toBe(1);
	});
});
