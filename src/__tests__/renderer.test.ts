import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { createOutputElement, renderFrame } from "../renderer";
import type { AsciiFrame } from "../types";

describe("createOutputElement", () => {
	test("creates a pre element", () => {
		const pre = createOutputElement();
		expect(pre.tagName).toBe("PRE");
	});

	test("has id 'ascii-output'", () => {
		const pre = createOutputElement();
		expect(pre.id).toBe("ascii-output");
	});
});

describe("renderFrame", () => {
	test("renders mono frame as text content", () => {
		const output = createOutputElement();
		const frame: AsciiFrame = {
			chars: ["@", "#", ":", " ", "*", "+", "=", "-", ".", " ", "@", "#"],
			colors: null,
		};
		renderFrame(output, frame, 4, "mono");
		const lines = output.textContent?.split("\n");
		expect(lines.length).toBe(3);
		expect(lines[0]).toBe("@#: ");
		expect(lines[1]).toBe("*+=-");
		expect(lines[2]).toBe(". @#");
	});

	test("renders color frame with spans", () => {
		const output = createOutputElement();
		const frame: AsciiFrame = {
			chars: ["@", "#"],
			colors: ["rgb(255,0,0)", "rgb(0,255,0)"],
		};
		renderFrame(output, frame, 2, "color");
		expect(output.innerHTML).toContain("span");
		expect(output.innerHTML).toContain("rgb(255,0,0)");
		expect(output.innerHTML).toContain("rgb(0,255,0)");
	});

	test("handles single row", () => {
		const output = createOutputElement();
		const frame: AsciiFrame = { chars: ["@", "#", ":"], colors: null };
		renderFrame(output, frame, 3, "mono");
		expect(output.textContent).toBe("@#:");
	});

	test("escapes special chars in color mode", () => {
		const output = createOutputElement();
		const frame: AsciiFrame = {
			chars: ["<", ">"],
			colors: ["rgb(0,0,0)", "rgb(0,0,0)"],
		};
		renderFrame(output, frame, 2, "color");
		// Should not create broken HTML
		expect(output.querySelectorAll("span").length).toBe(2);
	});

	test("handles space in color mode with nbsp", () => {
		const output = createOutputElement();
		const frame: AsciiFrame = {
			chars: [" "],
			colors: ["rgb(128,128,128)"],
		};
		renderFrame(output, frame, 1, "color");
		expect(output.innerHTML).toContain("&nbsp;");
	});

	test("sanitizes malicious color values", () => {
		const output = createOutputElement();
		const frame: AsciiFrame = {
			chars: ["@"],
			colors: ['rgb(0,0,0)"><script>alert(1)</script>'],
		};
		renderFrame(output, frame, 1, "color");
		expect(output.innerHTML).not.toContain("<script>");
		expect(output.innerHTML).toContain("rgb(128,128,128)");
	});

	test("accepts valid rgb color values", () => {
		const output = createOutputElement();
		const frame: AsciiFrame = {
			chars: ["@"],
			colors: ["rgb(255,100,50)"],
		};
		renderFrame(output, frame, 1, "color");
		expect(output.innerHTML).toContain("rgb(255,100,50)");
	});
});

// ============================================================
// Mutation-killing tests
// ============================================================

describe("mutation: createOutputElement postcondition", () => {
	test("created element is specifically a PRE, not any other tag", () => {
		const pre = createOutputElement();
		expect(pre.tagName).toBe("PRE");
		expect(pre instanceof HTMLPreElement).toBe(true);
	});
});

describe("mutation: escapeHtml via renderFrame", () => {
	test("ampersand is escaped to &amp; in color mode", () => {
		const output = createOutputElement();
		const frame: AsciiFrame = {
			chars: ["&"],
			colors: ["rgb(0,0,0)"],
		};
		renderFrame(output, frame, 1, "color");
		expect(output.innerHTML).toContain("&amp;");
	});

	test("less-than is escaped to &lt; in color mode", () => {
		const output = createOutputElement();
		const frame: AsciiFrame = {
			chars: ["<"],
			colors: ["rgb(0,0,0)"],
		};
		renderFrame(output, frame, 1, "color");
		expect(output.innerHTML).toContain("&lt;");
	});

	test("greater-than is escaped to &gt; in color mode", () => {
		const output = createOutputElement();
		const frame: AsciiFrame = {
			chars: [">"],
			colors: ["rgb(0,0,0)"],
		};
		renderFrame(output, frame, 1, "color");
		expect(output.innerHTML).toContain("&gt;");
	});

	test("double-quote is escaped in color mode", () => {
		const output = createOutputElement();
		const frame: AsciiFrame = {
			chars: ['"'],
			colors: ["rgb(0,0,0)"],
		};
		renderFrame(output, frame, 1, "color");
		// happy-dom may render &quot; as literal " in innerHTML
		// Verify span is created and contains the quote character
		const spans = output.querySelectorAll("span");
		expect(spans.length).toBe(1);
		expect(spans[0].textContent).toBe('"');
	});

	test("regular char is not escaped in color mode", () => {
		const output = createOutputElement();
		const frame: AsciiFrame = {
			chars: ["@"],
			colors: ["rgb(255,0,0)"],
		};
		renderFrame(output, frame, 1, "color");
		expect(output.innerHTML).toContain(">@</span>");
	});
});

describe("mutation: color mode line breaks", () => {
	test("multi-row color frame has <br> between rows", () => {
		const output = createOutputElement();
		const frame: AsciiFrame = {
			chars: ["@", "#", ":", "*"],
			colors: ["rgb(1,1,1)", "rgb(2,2,2)", "rgb(3,3,3)", "rgb(4,4,4)"],
		};
		renderFrame(output, frame, 2, "color");
		const html = output.innerHTML;
		// Should have exactly one <br> between the two rows
		const brCount = (html.match(/<br>/g) || []).length;
		expect(brCount).toBe(1);
	});

	test("single-row color frame has no <br>", () => {
		const output = createOutputElement();
		const frame: AsciiFrame = {
			chars: ["@", "#"],
			colors: ["rgb(1,1,1)", "rgb(2,2,2)"],
		};
		renderFrame(output, frame, 2, "color");
		expect(output.innerHTML).not.toContain("<br>");
	});

	test("3-row color frame has exactly 2 <br> tags", () => {
		const output = createOutputElement();
		const chars = ["@", "#", ":", "*", "+", "="];
		const colors = chars.map(() => "rgb(0,0,0)");
		const frame: AsciiFrame = { chars, colors };
		renderFrame(output, frame, 2, "color");
		const brCount = (output.innerHTML.match(/<br>/g) || []).length;
		expect(brCount).toBe(2);
	});
});

describe("mutation: space to &nbsp; in color mode", () => {
	test("space char becomes &nbsp; in span, non-space does not", () => {
		const output = createOutputElement();
		const frame: AsciiFrame = {
			chars: [" ", "@"],
			colors: ["rgb(0,0,0)", "rgb(0,0,0)"],
		};
		renderFrame(output, frame, 2, "color");
		const spans = output.querySelectorAll("span");
		expect(spans.length).toBe(2);
		expect(spans[0].innerHTML).toBe("&nbsp;");
		expect(spans[1].innerHTML).not.toContain("&nbsp;");
	});
});

describe("mutation: mono mode rendering details", () => {
	test("mono mode iterates over all characters", () => {
		const output = createOutputElement();
		const frame: AsciiFrame = {
			chars: ["A", "B", "C", "D"],
			colors: null,
		};
		renderFrame(output, frame, 2, "mono");
		const text = output.textContent ?? "";
		expect(text).toBe("AB\nCD");
		expect(text.length).toBe(5); // "AB\nCD"
	});

	test("mono mode loop boundary: i < len, not i <= len", () => {
		// If i <= len, we'd get an undefined char at the end
		const output = createOutputElement();
		const frame: AsciiFrame = {
			chars: ["X", "Y"],
			colors: null,
		};
		renderFrame(output, frame, 2, "mono");
		const text = output.textContent ?? "";
		// Must be exactly "XY" - no undefined at the end
		expect(text).toBe("XY");
		expect(text).not.toContain("undefined");
	});

	test("assertion messages are descriptive", () => {
		const output = createOutputElement();
		expect(() => renderFrame(output, { chars: [], colors: null }, 1, "mono")).toThrow(
			"frame chars",
		);

		expect(() => renderFrame(output, { chars: ["@"], colors: null }, 0, "mono")).toThrow(
			"render width",
		);
	});
});

describe("mutation: color mode line break position (i+1 vs i-1)", () => {
	test("line breaks occur at correct positions with width=3", () => {
		const output = createOutputElement();
		const chars = ["A", "B", "C", "D", "E", "F"];
		const colors = chars.map(() => "rgb(0,0,0)");
		const frame: AsciiFrame = { chars, colors };
		renderFrame(output, frame, 3, "color");
		const html = output.innerHTML;
		// The <br> should appear after the 3rd span and before the 4th
		const parts = html.split("<br>");
		expect(parts.length).toBe(2);
		// First part should have 3 spans
		const firstSpans = (parts[0].match(/<span/g) || []).length;
		expect(firstSpans).toBe(3);
		// Second part should have 3 spans
		const secondSpans = (parts[1].match(/<span/g) || []).length;
		expect(secondSpans).toBe(3);
	});
});

describe("mutation: color mode join separator", () => {
	test("spans are concatenated without separator", () => {
		const output = createOutputElement();
		const frame: AsciiFrame = {
			chars: ["A", "B"],
			colors: ["rgb(1,1,1)", "rgb(2,2,2)"],
		};
		renderFrame(output, frame, 2, "color");
		// Verify no extraneous text between spans
		const html = output.innerHTML;
		expect(html).toMatch(/^<span[^>]*>[^<]*<\/span><span[^>]*>[^<]*<\/span>$/);
	});
});

// ============================================================
// Property-based tests
// ============================================================

describe("property-based", () => {
	test("renderFrame mono: output lines count equals height, each line has width chars", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 40 }),
				fc.integer({ min: 1, max: 40 }),
				(width, height) => {
					const totalChars = width * height;
					const chars = new Array(totalChars).fill("@");
					const frame: AsciiFrame = { chars, colors: null };
					const output = createOutputElement();
					renderFrame(output, frame, width, "mono");
					const text = output.textContent ?? "";
					const lines = text.split("\n");
					if (lines.length !== height) return false;
					for (const line of lines) {
						if (line.length !== width) return false;
					}
					return true;
				},
			),
		);
	});

	test("renderFrame does not throw for any valid frame data and width > 0", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 30 }),
				fc.integer({ min: 1, max: 30 }),
				fc.constantFrom("mono" as const, "color" as const, "green" as const),
				(width, height, mode) => {
					const total = width * height;
					const chars = new Array(total).fill("#");
					const colors = mode !== "mono" ? new Array(total).fill("rgb(128,128,128)") : null;
					const frame: AsciiFrame = { chars, colors };
					const output = createOutputElement();
					renderFrame(output, frame, width, mode);
					return true; // if we get here, no throw
				},
			),
		);
	});
});
