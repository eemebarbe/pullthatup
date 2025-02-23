async function searchImages(query) {
	// Format query to "images of [search term]"
	const formattedQuery = query.toLowerCase().startsWith("images of")
		? query
		: `images of ${query}`;

	const url = `https://serpapi.com/search.json?q=${encodeURIComponent(
		formattedQuery
	)}&tbm=isch&api_key=${process.env.SERPAPI_API_KEY}&ijn=0&tbs=isz:l`;

	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();
		return data;
	} catch (error) {
		console.error("Error fetching from SerpApi:", error);
		throw error;
	}
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

		const data = await searchImages(query);

		// Log the response for debugging
		console.log("Image Search API response:", data);

		// Return only the image results
		return new Response(
			JSON.stringify({
				images_results: data.images_results || [],
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (error) {
		console.error("Image Search API error:", error);
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
