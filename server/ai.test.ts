import { describe, expect, it, vi } from "vitest";
import { classifyInput, validateGeneratedBody } from "./ai";

describe("classifyInput", () => {
	it("returns a validated object classification", async () => {
		const ai = {
			run: vi.fn().mockResolvedValue({
				choices: [
					{
						message: {
							content: JSON.stringify({
								valid: true,
								canonical: "pocket watch",
								subject_type: "object",
								species: null,
								specific_living_individual: false,
								interest: 2,
							}),
						},
					},
				],
			}),
		} as unknown as Ai;

		await expect(classifyInput(ai, "a pocket watch")).resolves.toMatchObject({
			valid: true,
			canonical: "pocket watch",
			subject_type: "object",
		});
	});

	it("fails closed after malformed JSON fails twice", async () => {
		const ai = {
			run: vi.fn().mockResolvedValue({
				choices: [{ message: { content: "not json" } }],
			}),
		} as unknown as Ai;

		await expect(classifyInput(ai, "asdfghjkl")).resolves.toBeNull();
		expect(ai.run).toHaveBeenCalledTimes(2);
	});

	it("validates cut-away markers and suffering language", () => {
		const restrained =
			"A door closed at 12:04. ⟦The mechanism⟧ was recovered after staff reported a missing utensil.";
		expect(
			validateGeneratedBody(restrained, "lab_animal", 1),
		).toBe(false);
	});

	it("allows balanced cut-away markers", () => {
		const body =
			"A door closed at 12:04. ⟦The mechanism⟧ was recovered, catalogued, and placed under observation. Staff then filed the required room report and requested new paint for the eastern wall. The machine remained inactive for the rest of the shift. Supervisors reviewed the duration, recovered objects, and observer notes before approving the release of the processing booth. A second clock was hung by maintenance. No further anomalies were recorded during the one-hour observation period.";
		expect(validateGeneratedBody(body, "lab_animal", 1)).toBe(true);
	});
});
