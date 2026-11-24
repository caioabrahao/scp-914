ALTER TABLE entries ADD COLUMN document_number INTEGER;

CREATE TABLE IF NOT EXISTS document_numbers (
	cache_key TEXT PRIMARY KEY,
	document_number INTEGER UNIQUE
);

INSERT OR IGNORE INTO document_numbers (cache_key, document_number)
SELECT
	cache_key,
	ROW_NUMBER() OVER (ORDER BY cached_at ASC, cache_key ASC)
FROM entries;

UPDATE entries
SET document_number = (
	SELECT document_number
	FROM document_numbers
	WHERE document_numbers.cache_key = entries.cache_key
);
