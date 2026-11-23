import type { DenialReason } from "./types";

const DENIAL_VARIANTS: Record<DenialReason, readonly string[]> = {
	invalid: [
		"TEST REQUEST 914-███ REJECTED. Reason: Submitted material could not be identified. Please resubmit with an object, substance or approved test subject.",
		"TEST REQUEST 914-███ REJECTED. Reason: The submitted text did not describe a testable item. Clarify the material and resubmit.",
		"TEST REQUEST 914-███ REJECTED. Reason: Records Office could not associate the submission with a physical object or approved subject.",
	],
	not_test_subject: [
		"TEST REQUEST 914-███ DENIED. Reason: Ethics Committee review. Subject is not registered Foundation test personnel. This attempt has been logged.",
		"TEST REQUEST 914-███ DENIED. Reason: A named or personally connected living subject is outside Foundation testing authorization.",
		"TEST REQUEST 914-███ DENIED. Reason: Ethics Committee records do not permit processing of this living individual.",
	],
	species_not_approved: [
		"TEST REQUEST 914-███ DENIED. Reason: Species is not on the approved test roster. Contact the Ethics Committee for roster amendments.",
		"TEST REQUEST 914-███ DENIED. Reason: The animal species is not an approved SCP-914 laboratory subject.",
		"TEST REQUEST 914-███ DENIED. Reason: Species approval is required before any machine testing. The roster was not amended.",
	],
	setting_not_approved_for_animals: [
		"TEST REQUEST 914-███ DENIED. Reason: Ethics Committee has not approved this setting for animal subjects. Approved settings: 1:1, Fine, Very Fine.",
		"TEST REQUEST 914-███ DENIED. Reason: Rough and Coarse output settings are unavailable for animal subjects. Use 1:1, Fine or Very Fine.",
		"TEST REQUEST 914-███ DENIED. Reason: This setting failed animal-welfare authorization. Approved settings: 1:1, Fine, Very Fine.",
	],
	system_fault: [
		"ENTRY UNAVAILABLE. Records office is reviewing this request. Try again later.",
		"ENTRY UNAVAILABLE. Classification records could not be verified. No test was run.",
		"ENTRY UNAVAILABLE. The Records Office is awaiting restoration of the verification service.",
	],
};

export function stableHash(value: string): number {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index++) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

export function getDenialEntry(reason: DenialReason, input: string) {
	const variants = DENIAL_VARIANTS[reason];
	const text = variants[stableHash(`${reason}|${input}`) % variants.length];
	return { kind: "denial" as const, reason, text };
}
