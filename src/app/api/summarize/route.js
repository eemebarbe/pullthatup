import OpenAI from "openai";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
	try {
		const { text, triggerWord, recentBatches } = await request.json();

		if (!text) {
			return new Response(JSON.stringify({ error: "Text is required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Check if trigger word is present (case insensitive)
		const triggerRegex = new RegExp(`\\b${triggerWord}\\b`, "i");
		const hasTriggered = triggerRegex.test(text);

		if (hasTriggered) {
			// If trigger word detected, check for commands first
			const commandCompletion = await openai.chat.completions.create({
				model: "gpt-3.5-turbo",
				messages: [
					{
						role: "system",
						content: `You are a voice command interpreter. Analyze the given text to determine if it contains a command after the trigger word. The possible commands are:

1. Opening a modal/grid square (e.g., "open number 1", "show me grid 3", etc.)
2. Closing a modal (e.g., "close this", "close modal", etc.)
3. Requesting more information about a topic (e.g., "tell me more about X", "what is X", etc.)

Return your response in this exact JSON format:
{
  "requestIntent": {
    "type": "open_modal" | "close_modal" | "more_info" | null,
    "gridNumber": number | null,
    "topic": string | null
  }
}

Only set a type if you're highly confident it matches one of the command intents.`,
					},
					{
						role: "user",
						content: `Analyze this text for commands:\n\n${text}\n\nRecent conversation context:\n${recentBatches.join(
							"\n"
						)}`,
					},
				],
				response_format: { type: "json_object" },
				temperature: 0,
			});

			const commandResponse = JSON.parse(
				commandCompletion.choices[0].message.content
			);

			// If a command was detected, return immediately with minimal analysis
			if (commandResponse.requestIntent.type) {
				return new Response(
					JSON.stringify({
						categories: [],
						mentions: [],
						...commandResponse,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					}
				);
			}
		}

		// Normal analysis without fact checking
		const completion = await openai.chat.completions.create({
			model: "gpt-3.5-turbo",
			messages: [
				{
					role: "system",
					content: `You are a content analysis assistant. Analyze the given text and return:
1. Up to 5 relevant categories for the content
2. Detect any mentions of online videos, products, celebrities, or current events

Return your response in this exact JSON format:
{
    "categories": ["category1", "category2", ...],
    "mentions": [
        {
            "type": "video"|"product"|"celebrity"|"current_event",
            "searchQuery": "search engine friendly description or name"
        }
    ],
    "requestIntent": {
        "type": null,
        "gridNumber": null,
        "topic": null
    }
}`,
				},
				{
					role: "user",
					content: `Analyze this text and provide categories and mentions:\n\n${text}`,
				},
			],
			response_format: { type: "json_object" },
			temperature: 0.7,
		});

		const gptResponse = JSON.parse(completion.choices[0].message.content);

		return new Response(JSON.stringify(gptResponse), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("API Error:", error);
		return new Response(
			JSON.stringify({
				error: "Failed to process text",
				details: error.message,
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}
