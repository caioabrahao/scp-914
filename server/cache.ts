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
		.prepare("SELECT value FROM entries WHERE cache_key = ?")
		.bind(key)
		.first<{ value: string }>();
	return row ? JSON.parse(row.value) as EntryResponse : null;
}

export async function setEntry(
	db: D1Database,
	key: string,
	value: EntryResponse,
): Promise<void> {
	await db
		.prepare(
			"INSERT OR REPLACE INTO entries (cache_key, value, cached_at) VALUES (?, ?, ?)",
		)
		.bind(key, JSON.stringify(value), Date.now())
		.run();
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
