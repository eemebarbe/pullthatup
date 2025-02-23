import OpenAI from "openai";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
	try {
		const { topic, context } = await request.json();

		const completion = await openai.chat.completions.create({
			model: "gpt-3.5-turbo",
			messages: [
				{
					role: "system",
					content: `You are a direct and concise information provider. When asked about a topic:
- If it's a factual question, provide only the specific fact or number, with no additional context
- If it's about a person, provide 2-3 key points about them
- If it's about an event, provide a 1-2 sentence summary
- If it's about a concept, provide a brief 1-2 sentence definition

Format in markdown, but keep it minimal. Avoid unnecessary headers or formatting.`,
				},
				{
					role: "user",
					content: `Provide concise information about: ${topic}\n\nContext from conversation: ${context}`,
				},
			],
			temperature: 0.3,
			max_tokens: 200,
		});

		return new Response(
			JSON.stringify({
				content: completion.choices[0].message.content,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (error) {
		console.error("API Error:", error);
		return new Response(
			JSON.stringify({
				error: "Failed to get information",
				details: error.message,
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}
