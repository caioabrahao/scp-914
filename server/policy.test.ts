import { describe, expect, it } from "vitest";
import { decidePolicy } from "./policy";
import type { Classification } from "./types";

function classification(
	overrides: Partial<Classification>,
): Classification {
	return {
		valid: true,
		canonical: "test item",
		subject_type: "object",
		species: null,
		specific_living_individual: false,
		interest: 2,
		...overrides,
	};
}

describe("decidePolicy", () => {
	it("allows standard objects", () => {
		expect(decidePolicy(classification({}), "fine")).toEqual({
			ok: true,
			rules: "standard",
		});
	});

	it("allows a Class-D human on any setting", () => {
		expect(
			decidePolicy(
				classification({
					canonical: "adult male, 167cm, 98kg",
					subject_type: "human",
				}),
				"rough",
			),
		).toMatchObject({ ok: true, rules: "d_class" });
	});

	it("allows approved animals outside harsh settings", () => {
		expect(
			decidePolicy(
				classification({
					subject_type: "animal",
					species: "white rat",
				}),
				"fine",
			),
		).toMatchObject({ ok: true, rules: "lab_animal" });
	});

	it("blocks approved animals on harsh settings", () => {
		expect(
			decidePolicy(
				classification({
					subject_type: "animal",
					species: "white rat",
				}),
				"rough",
			),
		).toEqual({
			ok: false,
			reason: "setting_not_approved_for_animals",
		});
	});

	it("blocks unapproved animals", () => {
		expect(
			decidePolicy(
				classification({ subject_type: "animal", species: "other" }),
				"fine",
			),
		).toEqual({ ok: false, reason: "species_not_approved" });
	});

	it("blocks named living subjects", () => {
		expect(
			decidePolicy(
				classification({
					subject_type: "animal",
					species: "other",
					specific_living_individual: true,
				}),
				"fine",
			),
		).toEqual({ ok: false, reason: "not_test_subject" });
	});

	it("allows owned objects", () => {
		expect(
			decidePolicy(
				classification({
					canonical: "grandma's wristwatch",
					specific_living_individual: false,
				}),
				"coarse",
			),
		).toMatchObject({ ok: true, rules: "standard" });
	});

	it("allows organic remains", () => {
		expect(
			decidePolicy(
				classification({ subject_type: "organic_remains" }),
				"fine",
			),
		).toEqual({ ok: true, rules: "organic" });
	});

	it("denies invalid classifications", () => {
		expect(
			decidePolicy(classification({ valid: false }), "fine"),
		).toEqual({ ok: false, reason: "invalid" });
	});
});
