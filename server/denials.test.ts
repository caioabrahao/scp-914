import { describe, expect, it } from "vitest";
import { getDenialEntry } from "./denials";

describe("getDenialEntry", () => {
	it("is deterministic for the same input and reason", () => {
		const first = getDenialEntry("not_test_subject", "my cat");
		const second = getDenialEntry("not_test_subject", "my cat");
		expect(first).toEqual(second);
	});

	it("returns the setting-specific animal hint", () => {
		const denial = getDenialEntry(
			"setting_not_approved_for_animals",
			"a white rat",
		);
		expect(denial.text).toContain("Approved settings:");
	});
});
