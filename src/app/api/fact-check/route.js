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
				headers: { "Content-Type": "application/json" },
			});
		}

		const completion = await openai.chat.completions.create({
			model: "gpt-3.5-turbo",
			messages: [
				{
					role: "system",
					content: `You are a fact-checking assistant. Analyze the given text for factual claims and verify their accuracy.

Guidelines for fact checking:
- Only identify specific, verifiable claims (not opinions or subjective statements)
- Mark factCheck as true ONLY if you find claims that are incorrect or need clarification
- If no claims need verification or all claims are accurate, mark factCheck as false
- Provide clear, concise explanations in the text field

Example responses:
- "The Earth is flat" -> factCheck: true, text: "This claim is incorrect. The Earth is spherical..."
- "I like pizza" -> factCheck: false, text: "No factual claims require verification."
- "The first iPhone came out in 2010" -> factCheck: true, text: "Correction: The first iPhone was released in 2007..."

Return your response in this exact JSON format:
{
    "factCheck": {
        "factCheck": boolean,
        "text": "explanation of corrections needed or confirmation no claims need verification"
    }
}`,
				},
				{
					role: "user",
					content: `Analyze this text for factual accuracy:\n\n${text}`,
				},
			],
			response_format: { type: "json_object" },
			temperature: 0,
		});

		const response = JSON.parse(completion.choices[0].message.content);

		return new Response(JSON.stringify(response), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("API Error:", error);
		return new Response(
			JSON.stringify({
				error: "Failed to process fact check",
				details: error.message,
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}
