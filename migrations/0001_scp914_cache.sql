CREATE TABLE IF NOT EXISTS classifications (
	cache_key TEXT PRIMARY KEY,
	value TEXT,
	cached_at INTEGER
);

CREATE TABLE IF NOT EXISTS entries (
	cache_key TEXT PRIMARY KEY,
	value TEXT,
	cached_at INTEGER
);

CREATE TABLE IF NOT EXISTS rate_limits (
	cache_key TEXT PRIMARY KEY,
	window_start INTEGER,
	request_count INTEGER
);
