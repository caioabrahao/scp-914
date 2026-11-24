import type { APPROVED_SPECIES } from "./constants";

export type Species =
	(typeof APPROVED_SPECIES)[number] | "other";

export type Classification = {
	valid: boolean;
	canonical: string;
	subject_type: "object" | "organic_remains" | "abstract" | "human" | "animal";
	species: Species | null;
	specific_living_individual: boolean;
	interest: 1 | 2 | 3;
};

export type DenialReason =
	| "invalid"
	| "not_test_subject"
	| "species_not_approved"
	| "setting_not_approved_for_animals"
	| "system_fault";

export type Rules = "standard" | "organic" | "d_class" | "lab_animal";

export type PolicyDecision =
	| { ok: true; rules: Rules; preamble?: string }
	| { ok: false; reason: DenialReason };

export type EntryResponse =
	| {
			kind: "entry";
			canonical: string;
			setting: string;
			tier: 1 | 2 | 3;
			preamble?: string;
			body: string;
			cached: boolean;
			firstExperimentedAt: number;
			documentNumber: number;
	  }
	| { kind: "denial"; reason: DenialReason; text: string };
