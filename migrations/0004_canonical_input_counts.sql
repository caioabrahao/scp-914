CREATE TABLE IF NOT EXISTS canonical_input_counts (
	canonical TEXT PRIMARY KEY,
	input_count INTEGER NOT NULL DEFAULT 0
);

INSERT INTO canonical_input_counts (canonical, input_count)
SELECT json_extract(value, '$.canonical'), COUNT(*)
FROM entries
WHERE json_extract(value, '$.kind') = 'entry'
GROUP BY json_extract(value, '$.canonical')
ON CONFLICT(canonical) DO UPDATE SET input_count = MAX(
	canonical_input_counts.input_count,
	excluded.input_count
);
