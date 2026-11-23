import type { DenialReason } from "./types";

export type PrecheckResult =
	| { ok: true; normalized: string }
	| { ok: false; reason: DenialReason };

export function normalizeInput(raw: string): string {
	return raw
		.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
		.replace(/\r?\n/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function precheckInput(raw: string): PrecheckResult {
	const normalized = normalizeInput(raw);

	if (!normalized || normalized.length > 100) {
		return { ok: false, reason: "invalid" };
	}

	const letters = normalized.match(/\p{L}/gu) ?? [];
	if (letters.length < 2) {
		return { ok: false, reason: "invalid" };
	}

	if (/[<>\[\]{}]/.test(normalized) && normalized.length < 12) {
		return { ok: false, reason: "invalid" };
	}

	const lowercase = normalized.toLowerCase();
	const counts = new Map<string, number>();
	for (const character of lowercase) {
		counts.set(character, (counts.get(character) ?? 0) + 1);
	}
	const maxRepeated = Math.max(...counts.values());
	if (maxRepeated / lowercase.length > 0.6) {
		return { ok: false, reason: "invalid" };
	}

	const ascii = lowercase.match(/[a-z]/g)?.join("") ?? "";
	if (ascii.length >= 6 && !/[aeiouy]/.test(ascii)) {
		return { ok: false, reason: "invalid" };
	}
	if (
		ascii.length >= 6 &&
		/(?:asdfgh|asdfghjkl|qwerty|zxcvbn)/.test(ascii)
	) {
		return { ok: false, reason: "invalid" };
	}

	return { ok: true, normalized };
}
