import type { Classification, EntryResponse } from "./types";

export async function getClassification(
	db: D1Database,
	key: string,
): Promise<Classification | null> {
	const row = await db
		.prepare("SELECT value FROM classifications WHERE cache_key = ?")
		.bind(key)
		.first<{ value: string }>();
	return row ? JSON.parse(row.value) as Classification : null;
}

export async function setClassification(
	db: D1Database,
	key: string,
	value: Classification,
): Promise<void> {
	await db
		.prepare(
			"INSERT OR REPLACE INTO classifications (cache_key, value, cached_at) VALUES (?, ?, ?)",
		)
		.bind(key, JSON.stringify(value), Date.now())
		.run();
}

export async function getEntry(
	db: D1Database,
	key: string,
): Promise<EntryResponse | null> {
	const row = await db
		.prepare(
			"SELECT value, first_experimented_at, cached_at, document_number FROM entries WHERE cache_key = ?",
		)
		.bind(key)
		.first<{
			value: string;
			first_experimented_at: number | null;
			cached_at: number;
			document_number: number | null;
		}>();
	if (!row) return null;

	try {
		const entry = JSON.parse(row.value) as EntryResponse;
		if (entry.kind !== "entry") return entry;
		const documentNumber =
			row.document_number ??
			entry.documentNumber ??
			await getOrCreateDocumentNumber(db, key);
		return {
			...entry,
			firstExperimentedAt:
				row.first_experimented_at ??
				entry.firstExperimentedAt ??
				row.cached_at,
			documentNumber,
		};
	} catch {
		return null;
	}
}

export async function setEntry(
	db: D1Database,
	key: string,
	value: EntryResponse,
): Promise<void> {
	await db
		.prepare(
			"INSERT OR REPLACE INTO entries (cache_key, value, cached_at, first_experimented_at, document_number) VALUES (?, ?, ?, ?, ?)",
		)
		.bind(
			key,
			JSON.stringify(value),
			Date.now(),
			value.kind === "entry" ? value.firstExperimentedAt : null,
			value.kind === "entry" ? value.documentNumber : null,
		)
		.run();
}

export async function getOrCreateFirstExperimentedAt(
	db: D1Database,
	canonical: string,
): Promise<number> {
	const now = Date.now();
	await db
		.prepare(
			"INSERT OR IGNORE INTO canonical_experiments (canonical, first_experimented_at) VALUES (?, ?)",
		)
		.bind(canonical, now)
		.run();

	const row = await db
		.prepare(
			"SELECT first_experimented_at FROM canonical_experiments WHERE canonical = ?",
		)
		.bind(canonical)
		.first<{ first_experimented_at: number }>();

	return row?.first_experimented_at ?? now;
}

export async function getOrCreateDocumentNumber(
	db: D1Database,
	entryKey: string,
): Promise<number> {
	await db
		.prepare(
			"INSERT OR IGNORE INTO document_numbers (cache_key) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM document_numbers WHERE cache_key = ?)",
		)
		.bind(entryKey, entryKey)
		.run();

	const row = await db
		.prepare(
			"SELECT document_number FROM document_numbers WHERE cache_key = ?",
		)
		.bind(entryKey)
		.first<{ document_number: number }>();

	if (row?.document_number) return row.document_number;

	const maxRow = await db
		.prepare(
			"SELECT COALESCE(MAX(document_number), 0) AS maximum FROM document_numbers",
		)
		.first<{ maximum: number }>();
	const documentNumber = (maxRow?.maximum ?? 0) + 1;

	await db
		.prepare(
			"INSERT OR REPLACE INTO document_numbers (cache_key, document_number) VALUES (?, ?)",
		)
		.bind(entryKey, documentNumber)
		.run();
	return documentNumber;
}

export type ArchiveItem = {
	id: string;
	canonical: string;
	setting: string;
	tier: 1 | 2 | 3;
	preamble?: string;
	cachedAt: number;
	firstExperimentedAt: number;
	documentNumber: number;
};

export async function listEntries(
	db: D1Database,
	limit = 50,
	offset = 0,
): Promise<ArchiveItem[]> {
	const result = await db
		.prepare(
			"SELECT cache_key, value, cached_at, first_experimented_at, document_number FROM entries ORDER BY cached_at DESC LIMIT ? OFFSET ?",
		)
		.bind(limit, offset)
		.all<{
			cache_key: string;
			value: string;
			cached_at: number;
			first_experimented_at: number | null;
			document_number: number | null;
		}>();

	const items: Array<ArchiveItem | null> = await Promise.all(
		result.results.map(async (row) => {
			try {
				const entry = JSON.parse(row.value) as EntryResponse;
				if (entry.kind !== "entry") return null;
				const documentNumber =
					row.document_number ??
					entry.documentNumber ??
					await getOrCreateDocumentNumber(db, row.cache_key);
				return {
					id: row.cache_key,
					canonical: entry.canonical,
					setting: entry.setting,
					tier: entry.tier,
					...(entry.preamble ? { preamble: entry.preamble } : {}),
					cachedAt: row.cached_at,
					firstExperimentedAt:
						row.first_experimented_at ??
						entry.firstExperimentedAt ??
						row.cached_at,
					documentNumber,
				};
			} catch {
				return null;
			}
		}),
	);

	return items.filter((item): item is ArchiveItem => item !== null);
}

export async function getEntryByKey(
	db: D1Database,
	key: string,
): Promise<EntryResponse | null> {
	const row = await db
		.prepare(
			"SELECT value, first_experimented_at, cached_at, document_number FROM entries WHERE cache_key = ?",
		)
		.bind(key)
		.first<{
			value: string;
			first_experimented_at: number | null;
			cached_at: number;
			document_number: number | null;
		}>();
	if (!row) return null;

	try {
		const entry = JSON.parse(row.value) as EntryResponse;
		if (entry.kind !== "entry") return null;
		const documentNumber =
			row.document_number ??
			entry.documentNumber ??
			await getOrCreateDocumentNumber(db, key);
		return {
			...entry,
			firstExperimentedAt:
				row.first_experimented_at ??
				entry.firstExperimentedAt ??
				row.cached_at,
			documentNumber,
		};
	} catch {
		return null;
	}
}

export async function checkGenerationRateLimit(
	db: D1Database,
	ip: string,
	limit = 10,
	windowMs = 60_000,
): Promise<boolean> {
	const now = Date.now();
	const key = `generation:${ip}`;
	const row = await db
		.prepare(
			"SELECT window_start, request_count FROM rate_limits WHERE cache_key = ?",
		)
		.bind(key)
		.first<{ window_start: number; request_count: number }>();

	if (!row || now - row.window_start >= windowMs) {
		await db
			.prepare(
				"INSERT OR REPLACE INTO rate_limits (cache_key, window_start, request_count) VALUES (?, ?, 1)",
			)
			.bind(key, now)
			.run();
		return true;
	}

	if (row.request_count >= limit) return false;

	await db
		.prepare(
			"UPDATE rate_limits SET request_count = request_count + 1 WHERE cache_key = ?",
		)
		.bind(key)
		.run();
	return true;
}
