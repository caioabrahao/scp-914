import {
	generateScp914Addendum,
	isScp914Setting,
} from "./ai";

export interface Env {
	AI: Ai;
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

		const input =
			typeof body.input === "string" ? body.input.trim() : "";
		const setting =
			typeof body.setting === "string" ? body.setting : "";

		if (!input) {
			return Response.json({ error: "Input is required" }, { status: 400 });
		}

		if (!isScp914Setting(setting)) {
			return Response.json({ error: "Invalid SCP-914 setting" }, { status: 400 });
		}

		try {
			const text = await generateScp914Addendum(env.AI, input, setting);

			if (!text) {
				return Response.json(
					{ error: "The AI returned an empty response" },
					{ status: 502 },
				);
			}

			return Response.json({ response: text });
		} catch (error) {
			console.error("AI request failed", error);
			return Response.json(
				{ error: "Unable to get a response from the AI" },
				{ status: 502 },
			);
		}
	},
} satisfies ExportedHandler<Env>;