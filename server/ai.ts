const MODEL = "@cf/google/gemma-4-26b-a4b-it";

export const SCP_914_SETTINGS = [
	"Rough",
	"Coarse",
	"1:1",
	"Fine",
	"Very Fine",
] as const;

export type Scp914Setting = (typeof SCP_914_SETTINGS)[number];

const TWISTS = [
	"a researcher notes an unrelated, mundane detail",
	"the output has a faint smell or sound",
	"a minor side effect appears hours later",
	"the item is slightly more than it was",
];

const SETTING_RULES: Record<string, string> = {
	rough: "Object is torn apart into crude components. Messy, a bit violent.",
	coarse: "Object is altered in a crude, mostly worse way.",
	"1:1": "Object is rebuilt as something of the same kind, subtly different.",
	fine: "Object is improved, but in a slightly unexpected way.",
	"very fine": "Object becomes something stranger and better than it should be.",
};

function hash(value: string): number {
	let result = 2166136261;

	for (let index = 0; index < value.length; index++) {
		result ^= value.charCodeAt(index);
		result = Math.imul(result, 16777619);
	}

	return result >>> 0;
}

export function isScp914Setting(
	value: string,
): value is Scp914Setting {
	return SCP_914_SETTINGS.some((setting) => setting === value);
}

export async function generateScp914Addendum(
	ai: Ai,
	input: string,
	setting: Scp914Setting,
): Promise<string> {
	const settingKey = setting.toLowerCase();
	const twist = TWISTS[hash(`${input}|${settingKey}`) % TWISTS.length];

	const response = await ai.run(MODEL, {
		messages: [
			{
				role: "system",
				content: `You are a junior researcher at the SCP Foundation writing a test log for SCP-914, a clockwork machine that transforms objects placed inside it. Your logs are circulated around the office because they are funny without ever trying to be.

TEST DATA
Object: ${input}
Dial setting: ${setting}
What this setting does: ${SETTING_RULES[setting]}
Detail to include: ${twist}

HOW TO WRITE IT
- Deadpan. The stranger the event, the flatter the delivery. Never wink at the reader or explain a joke.
- Be concrete. Use numbers, durations, materials and measurements instead of adjectives. "14 gears and a warm spring" beats "mechanical parts".
- The result must be a specific, nameable object that clearly grows out of the input. No vague "something strange emerged".
- Work the required detail in naturally, as if it were an ordinary part of the record. Do not announce it.
- Use at most one redaction (████ or [DATA EXPUNGED]), and only where it adds to the joke.
- Treat absurd events with bureaucratic seriousness: procedures, complaints, paperwork.
- No moralizing, no meta commentary, no mention of being an AI, no real-world instructions.
- Format the response in Markdown, keeping the output format.

OUTPUT FORMAT (exactly these four labeled lines, nothing before or after)
Input: <object and setting>
Processing: <1-2 sentences on what the machine did, with a sensory or procedural detail>
Result: <what came out, described concretely>
Note: <one short, human line from a researcher>

EXAMPLES (for voice and format only; do not reuse their jokes or details)

Input: Wristwatch, Rough
Processing: Item was placed in the INTAKE booth and the machine ran for 11 seconds. A sound described by staff as "cutlery falling down stairs" was recorded.
Result: 14 gears, 2 springs and a quantity of glass fragments. One gear remains warm to the touch.
Note: Please stop leaving the warm gear in the break room.

Input: Ballpoint pen, Very Fine
Processing: Machine ran for 4 minutes, 3 minutes longer than any prior pen. The OUTPUT door was sealed per protocol until it stopped humming.
Result: A black lacquer fountain pen that writes in the handwriting of whoever holds it, only neater. Ink level unchanged after 40 pages.
Note: Dr. ████ has been asked to stop signing expense reports with it.`
			},
			{
				role: "user",
				content: `Input: ${input}, ${setting}`,
			},
		],
		temperature: 0.95,
		chat_template_kwargs: {
			enable_thinking: false,
		},
	});

	const content = response.choices[0]?.message.content;
	return typeof content === "string" ? content.trim() : "";
}
