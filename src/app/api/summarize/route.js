import OpenAI from "openai";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
	try {
		const { text } = await request.json();

		if (!text) {
			return new Response(JSON.stringify({ error: "Text is required" }), {
				status: 400,
				headers: {
					"Content-Type": "application/json",
				},
			});
		}

		const completion = await openai.chat.completions.create({
			model: "gpt-3.5-turbo",
			messages: [
				{
					role: "system",
					content: `You are a fact-checking and categorization assistant. Analyze the given text and return a JSON object with:
					1. Fact check results including whether any claims need correction
					2. Up to 5 relevant categories for the content
					3. Detect any mentions of online videos, products, celebrities, or current events
					
					Return your response in this exact JSON format:
					{
						"factCheck": {
							"factCheck": boolean,
							"text": "explanation of any corrections needed or confirmation no claims need verification"
						},
						"categories": ["category1", "category2", ...],
						"mentions": [
							{
								"type": "video"|"product"|"celebrity"|"current_event",
								"searchQuery": "search engine friendly description or name"
							}
						]
					}`,
				},
				{
					role: "user",
					content: `Analyze this text and provide fact check, categories, and mentions:\n\n${text}`,
				},
			],
			response_format: { type: "json_object" },
			max_tokens: 500,
			temperature: 0.7,
		});

		const gptResponse = JSON.parse(completion.choices[0].message.content);

		return new Response(JSON.stringify(gptResponse), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
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
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}
}
