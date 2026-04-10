import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import {
	assertInRange,
	assertNonEmpty,
	assertPositive,
	postcondition,
	precondition,
} from "../assert";

describe("precondition", () => {
	test("passes when condition is true", () => {
		expect(() => precondition(true, "should pass")).not.toThrow();
	});

	test("throws when condition is false", () => {
		expect(() => precondition(false, "value must be positive")).toThrow(
			"Precondition failed: value must be positive",
		);
	});
});

describe("postcondition", () => {
	test("passes when condition is true", () => {
		expect(() => postcondition(true, "should pass")).not.toThrow();
	});

	test("throws when condition is false", () => {
		expect(() => postcondition(false, "result out of range")).toThrow(
			"Postcondition failed: result out of range",
		);
	});
});

describe("assertInRange", () => {
	test("passes for value within range", () => {
		expect(() => assertInRange(5, 0, 10, "val")).not.toThrow();
	});

	test("passes for value at min boundary", () => {
		expect(() => assertInRange(0, 0, 255, "val")).not.toThrow();
	});

	test("passes for value at max boundary", () => {
		expect(() => assertInRange(255, 0, 255, "val")).not.toThrow();
	});

	test("throws for value below min", () => {
		expect(() => assertInRange(-1, 0, 255, "channel")).toThrow(
			"channel must be in range [0, 255], got -1",
		);
	});

	test("throws for value above max", () => {
		expect(() => assertInRange(256, 0, 255, "channel")).toThrow(
			"channel must be in range [0, 255], got 256",
		);
	});
});

describe("assertPositive", () => {
	test("passes for positive value", () => {
		expect(() => assertPositive(1, "width")).not.toThrow();
	});

	test("throws for zero", () => {
		expect(() => assertPositive(0, "width")).toThrow("width must be positive, got 0");
	});

	test("throws for negative value", () => {
		expect(() => assertPositive(-5, "height")).toThrow("height must be positive, got -5");
	});
});

describe("assertNonEmpty", () => {
	test("passes for non-empty array", () => {
		expect(() => assertNonEmpty([1, 2, 3], "ramp")).not.toThrow();
	});

	test("throws for empty array", () => {
		expect(() => assertNonEmpty([], "ramp")).toThrow("ramp must not be empty");
	});
});

// ============================================================
// Property-based tests
// ============================================================

describe("property-based", () => {
	test("assertInRange accepts all values in [min, max]", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: -1000, max: 1000 }),
				fc.integer({ min: -1000, max: 1000 }),
				(a, b) => {
					const min = Math.min(a, b);
					const max = Math.max(a, b);
					// pick a value in [min, max]
					const v = min + Math.floor(Math.random() * (max - min + 1));
					try {
						assertInRange(v, min, max, "test");
						return true;
					} catch {
						return false;
					}
				},
			),
		);
	});

	test("assertInRange rejects values outside [min, max]", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: -1000, max: 1000 }),
				fc.integer({ min: -1000, max: 1000 }),
				fc.integer({ min: 1, max: 500 }),
				(a, b, offset) => {
					const min = Math.min(a, b);
					const max = Math.max(a, b);
					// test below min
					let threw = false;
					try {
						assertInRange(min - offset, min, max, "test");
					} catch {
						threw = true;
					}
					if (!threw) return false;
					// test above max
					threw = false;
					try {
						assertInRange(max + offset, min, max, "test");
					} catch {
						threw = true;
					}
					return threw;
				},
			),
		);
	});

	test("assertPositive accepts all positive integers", () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 100000 }), (v) => {
				try {
					assertPositive(v, "test");
					return true;
				} catch {
					return false;
				}
			}),
		);
	});

	test("assertPositive rejects zero and negative values", () => {
		fc.assert(
			fc.property(fc.integer({ min: -100000, max: 0 }), (v) => {
				try {
					assertPositive(v, "test");
					return false;
				} catch {
					return true;
				}
			}),
		);
	});
});
