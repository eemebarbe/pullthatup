const SerpApi = require("google-search-results-nodejs");

const serpApiKey = process.env.SERPAPI_API_KEY;

if (!serpApiKey) {
	throw new Error("Missing SERPAPI_API_KEY in environment variables.");
}

/**
 * Searches the web using SerpApi.
 * @param query The search string.
 * @returns The JSON result from SerpApi.
 */
async function searchWeb(query, tbm) {
	const search = new SerpApi.GoogleSearch(serpApiKey);

	const params = {
		q: query,
		location: "United States",
		hl: "en",
		gl: "us",
		num: 10,
	};

	return new Promise((resolve, reject) => {
		search.json(
			params,
			(data) => {
				resolve(data);
			},
			(error) => {
				reject(error);
			}
		);
	});
}

export async function GET(request) {
	try {
		const { searchParams } = new URL(request.url);
		const query = searchParams.get("query");

		if (!query) {
			return new Response(
				JSON.stringify({ error: "Query parameter is required" }),
				{ status: 400, headers: { "Content-Type": "application/json" } }
			);
		}

		const data = await searchWeb(query);

		// Log the response for debugging
		console.log("Search API response:", data);

		// Make sure we're returning the expected format
		return new Response(
			JSON.stringify({
				organic_results: data.organic_results || [],
				// Include any other relevant fields from the SerpApi response
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (error) {
		console.error("Search API error:", error);
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
