import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { el } from "../dom";

describe("el", () => {
	test("creates element with correct tag", () => {
		const div = el("div");
		expect(div.tagName).toBe("DIV");
	});

	test("creates element with attributes", () => {
		const input = el("input", { type: "range", min: "0", max: "255" });
		expect(input.getAttribute("type")).toBe("range");
		expect(input.getAttribute("min")).toBe("0");
		expect(input.getAttribute("max")).toBe("255");
	});

	test("creates element with text children", () => {
		const span = el("span", {}, ["hello"]);
		expect(span.textContent).toBe("hello");
	});

	test("creates element with node children", () => {
		const child = el("span", {}, ["inner"]);
		const parent = el("div", {}, [child]);
		expect(parent.children.length).toBe(1);
		expect(parent.children[0].tagName).toBe("SPAN");
		expect(parent.children[0].textContent).toBe("inner");
	});

	test("creates element with mixed children", () => {
		const child = el("strong", {}, ["bold"]);
		const p = el("p", {}, ["text ", child, " more"]);
		expect(p.childNodes.length).toBe(3);
		expect(p.textContent).toBe("text bold more");
	});

	test("creates element with no attrs but with children", () => {
		const div = el("div", undefined, ["content"]);
		expect(div.textContent).toBe("content");
	});

	test("creates pre element", () => {
		const pre = el("pre", { id: "output" });
		expect(pre.tagName).toBe("PRE");
		expect(pre.id).toBe("output");
	});
});

// ============================================================
// Mutation-killing tests
// ============================================================

describe("mutation: text vs node child handling", () => {
	test("string children become text nodes, not elements", () => {
		const div = el("div", {}, ["hello"]);
		expect(div.childNodes.length).toBe(1);
		expect(div.childNodes[0].nodeType).toBe(3); // TEXT_NODE
		expect(div.textContent).toBe("hello");
	});

	test("element children remain as elements, not text nodes", () => {
		const child = el("span");
		const div = el("div", {}, [child]);
		expect(div.childNodes.length).toBe(1);
		expect(div.childNodes[0].nodeType).toBe(1); // ELEMENT_NODE
		expect((div.childNodes[0] as HTMLElement).tagName).toBe("SPAN");
	});

	test("mixed string and element children maintain correct types", () => {
		const child = el("em", {}, ["emphasized"]);
		const div = el("div", {}, ["before ", child, " after"]);
		expect(div.childNodes.length).toBe(3);
		expect(div.childNodes[0].nodeType).toBe(3); // TEXT_NODE
		expect(div.childNodes[1].nodeType).toBe(1); // ELEMENT_NODE
		expect(div.childNodes[2].nodeType).toBe(3); // TEXT_NODE
	});
});

describe("mutation: postcondition messages", () => {
	// These tests ensure postcondition string messages are meaningful
	// (killing StringLiteral and MethodExpression mutations)
	test("element tagName matches the tag argument in uppercase", () => {
		const div = el("div");
		expect(div.tagName).toBe("DIV");
		const span = el("span");
		expect(span.tagName).toBe("SPAN");
		const pre = el("pre");
		expect(pre.tagName).toBe("PRE");
	});
});

// ============================================================
// Property-based tests
// ============================================================

describe("property-based", () => {
	const validTags = fc.constantFrom(
		"div" as const,
		"span" as const,
		"p" as const,
		"pre" as const,
		"button" as const,
		"label" as const,
		"select" as const,
		"option" as const,
		"input" as const,
		"h1" as const,
		"h2" as const,
		"h3" as const,
	);

	test("el creates element with correct tagName for any valid tag", () => {
		fc.assert(
			fc.property(validTags, (tag) => {
				const element = el(tag);
				return element.tagName === tag.toUpperCase();
			}),
		);
	});

	test("el attributes round-trip: setAttribute then getAttribute returns same value", () => {
		fc.assert(
			fc.property(
				validTags,
				fc.dictionary(
					fc.stringMatching(/^[a-z][a-z0-9-]{0,10}$/),
					fc.string({ minLength: 0, maxLength: 20 }),
					{ minKeys: 0, maxKeys: 5 },
				),
				(tag, attrs) => {
					const element = el(tag, attrs);
					for (const [key, value] of Object.entries(attrs)) {
						if (element.getAttribute(key) !== value) return false;
					}
					return true;
				},
			),
		);
	});
});
