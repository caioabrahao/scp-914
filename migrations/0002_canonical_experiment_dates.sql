ALTER TABLE entries ADD COLUMN first_experimented_at INTEGER;

CREATE TABLE IF NOT EXISTS canonical_experiments (
	canonical TEXT PRIMARY KEY,
	first_experimented_at INTEGER NOT NULL
);
