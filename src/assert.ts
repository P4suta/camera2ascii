export function precondition(condition: boolean, message: string): asserts condition {
	if (!condition) {
		throw new Error(`Precondition failed: ${message}`);
	}
}

export function postcondition(condition: boolean, message: string): asserts condition {
	if (!condition) {
		throw new Error(`Postcondition failed: ${message}`);
	}
}

export function assertInRange(value: number, min: number, max: number, name: string): void {
	if (value < min || value > max) {
		throw new Error(`${name} must be in range [${min}, ${max}], got ${value}`);
	}
}

export function assertPositive(value: number, name: string): void {
	if (value <= 0) {
		throw new Error(`${name} must be positive, got ${value}`);
	}
}

export function assertNonEmpty(arr: readonly unknown[], name: string): void {
	if (arr.length === 0) {
		throw new Error(`${name} must not be empty`);
	}
}
