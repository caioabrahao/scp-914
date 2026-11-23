import {
	classifyInput,
	computeDetailTier,
	generateScp914Addendum,
	normalizeScp914Setting,
	makePreamble,
	validateGeneratedBody,
	type Scp914Setting,
} from "./ai";
import {
	checkGenerationRateLimit,
	getClassification,
	getEntry,
	setClassification,
	setEntry,
} from "./cache";
import { PROMPT_VERSION } from "./constants";
import { getDenialEntry } from "./denials";
import { precheckInput } from "./prechecks";
import { decidePolicy } from "./policy";
import type { EntryResponse } from "./types";
import { sha256 } from "./utils";

export interface Env {
	AI: Ai;
	DB: D1Database;
}

function settingKey(setting: Scp914Setting): string {
	return setting.toLowerCase();
}

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname !== "/api/" && url.pathname !== "/api") {
			return new Response("Not found", { status: 404 });
		}

		if (request.method !== "POST") {
			return Response.json({ error: "POST a JSON prompt" }, { status: 405 });
		}

		let body: { input?: unknown; setting?: unknown };
		try {
			body = await request.json();
		} catch {
			return Response.json({ error: "Invalid JSON" }, { status: 400 });
		}

		const rawInput =
			typeof body.input === "string" ? body.input : "";
		const precheck = precheckInput(rawInput);
		if (!precheck.ok) {
			return Response.json(getDenialEntry(precheck.reason, rawInput));
		}

		const setting =
			typeof body.setting === "string"
				? normalizeScp914Setting(body.setting)
				: undefined;
		if (!setting) {
			return Response.json(
				getDenialEntry("invalid", precheck.normalized),
				{ status: 400 },
			);
		}

		try {
			const normalizedHash = await sha256(precheck.normalized);
			const classificationKey =
				`cls:${PROMPT_VERSION}:${normalizedHash}`;
			let classification = await getClassification(env.DB, classificationKey);

			if (!classification) {
				const ip =
					request.headers.get("cf-connecting-ip") ??
					request.headers.get("x-forwarded-for") ??
					"unknown";
				if (!(await checkGenerationRateLimit(env.DB, ip))) {
					return Response.json(
						getDenialEntry("system_fault", precheck.normalized),
						{ status: 429 },
					);
				}

				classification = await classifyInput(env.AI, precheck.normalized);
				if (!classification) {
					return Response.json(
						getDenialEntry("system_fault", precheck.normalized),
						{ status: 502 },
					);
				}
				await setClassification(env.DB, classificationKey, classification);
			}

			const policy = decidePolicy(classification, settingKey(setting));
			if (!policy.ok) {
				return Response.json(
					getDenialEntry(policy.reason, classification.canonical || precheck.normalized),
				);
			}

			const canonicalHash = await sha256(classification.canonical);
			const entryKey =
				`entry:${PROMPT_VERSION}:${canonicalHash}:${settingKey(setting)}`;
			const cachedEntry = await getEntry(env.DB, entryKey);
			if (cachedEntry) {
				const entry: EntryResponse =
					cachedEntry.kind === "entry"
						? { ...cachedEntry, cached: true }
						: cachedEntry;
				return Response.json(entry);
			}

			const ip =
				request.headers.get("cf-connecting-ip") ??
				request.headers.get("x-forwarded-for") ??
				"unknown";
			if (!(await checkGenerationRateLimit(env.DB, ip))) {
				return Response.json(
					getDenialEntry("system_fault", classification.canonical),
					{ status: 429 },
				);
			}

			const tier = computeDetailTier(
				classification.canonical,
				classification.interest,
			);
			const preamble = makePreamble(
				policy.rules,
				classification,
				classification.canonical,
				setting,
			);

			let body = await generateScp914Addendum(
				env.AI,
				classification.canonical,
				setting,
				policy.rules,
				tier,
				classification,
			);

			if (
				!body ||
				(policy.rules !== "standard" &&
					!validateGeneratedBody(body, policy.rules, tier))
			) {
				body = await generateScp914Addendum(
					env.AI,
					classification.canonical,
					setting,
					policy.rules,
					tier,
					classification,
					true,
				);
			}

			if (
				!body ||
				(policy.rules !== "standard" &&
					!validateGeneratedBody(body, policy.rules, tier))
			) {
				return Response.json(
					getDenialEntry("system_fault", classification.canonical),
					{ status: 502 },
				);
			}

			const entry: EntryResponse = {
				kind: "entry",
				canonical: classification.canonical,
				setting: settingKey(setting),
				tier,
				preamble,
				body,
				cached: false,
			};
			await setEntry(env.DB, entryKey, entry);
			return Response.json(entry);
		} catch (error) {
			console.error("SCP-914 request failed", error);
			return Response.json(
				getDenialEntry("system_fault", rawInput),
				{ status: 502 },
			);
		}
	},
} satisfies ExportedHandler<Env>;