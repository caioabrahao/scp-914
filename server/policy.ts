import { BLOCK_HUMANS_ON_HARSH } from "./constants";
import type { Classification, PolicyDecision } from "./types";

export const HARSH_SETTINGS = new Set(["rough", "coarse"]);

export function decidePolicy(
	classification: Classification,
	setting: string,
): PolicyDecision {
	if (!classification.valid) {
		return { ok: false, reason: "invalid" };
	}

	if (
		(classification.subject_type === "human" ||
			classification.subject_type === "animal") &&
		classification.specific_living_individual
	) {
		return { ok: false, reason: "not_test_subject" };
	}

	if (classification.subject_type === "animal") {
		if (!classification.species || classification.species === "other") {
			return { ok: false, reason: "species_not_approved" };
		}
		if (HARSH_SETTINGS.has(setting.toLowerCase())) {
			return {
				ok: false,
				reason: "setting_not_approved_for_animals",
			};
		}
		return {
			ok: true,
			rules: "lab_animal",
			preamble: "LAB_ANIMAL_PREAMBLE",
		};
	}

	if (classification.subject_type === "human") {
		if (
			BLOCK_HUMANS_ON_HARSH &&
			HARSH_SETTINGS.has(setting.toLowerCase())
		) {
			return {
				ok: false,
				reason: "setting_not_approved_for_animals",
			};
		}
		return { ok: true, rules: "d_class", preamble: "D_CLASS_PREAMBLE" };
	}

	if (classification.subject_type === "organic_remains") {
		return { ok: true, rules: "organic" };
	}

	return { ok: true, rules: "standard" };
}
