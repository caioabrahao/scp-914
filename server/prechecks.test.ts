import { describe, expect, it } from "vitest";
import { normalizeInput, precheckInput } from "./prechecks";

describe("precheckInput", () => {
	it("normalizes whitespace and control characters", () => {
		expect(normalizeInput("  a\r\n  pocket\twatch  ")).toBe(
			"a pocket watch",
		);
	});

	it("allows ordinary objects", () => {
		expect(precheckInput("a pocket watch")).toEqual({
			ok: true,
			normalized: "a pocket watch",
		});
	});

	it.each([
		"",
		"123456",
		"😀😀😀",
		"asdfghjkl",
		"aaaaaaaaaaaaaaaa",
		"x".repeat(101),
	])("rejects invalid input %#", (input) => {
		expect(precheckInput(input).ok).toBe(false);
	});
});
