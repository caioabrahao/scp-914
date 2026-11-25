import { describe, expect, it, vi } from "vitest";
import { recordCanonicalInput } from "./cache";

describe("recordCanonicalInput", () => {
	it("atomically increments the canonical input count", async () => {
		const run = vi.fn().mockResolvedValue({});
		const bind = vi.fn().mockReturnValue({ run });
		const prepare = vi.fn().mockReturnValue({ bind });
		const db = { prepare } as unknown as D1Database;

		await recordCanonicalInput(db, "pocket watch");

		expect(prepare).toHaveBeenCalledWith(
			expect.stringContaining(
				"ON CONFLICT(canonical) DO UPDATE SET input_count = input_count + 1",
			),
		);
		expect(bind).toHaveBeenCalledWith("pocket watch");
		expect(run).toHaveBeenCalledOnce();
	});
});
