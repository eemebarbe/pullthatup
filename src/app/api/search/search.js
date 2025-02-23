const serpApiKey = process.env.SERPAPI_API_KEY;

if (!serpApiKey) {
  throw new Error("Missing SERPAPI_API_KEY in environment variables.");
}

/**
 * Searches the web using SerpApi.
 * @param query The search string.
 * @returns The JSON result from SerpApi.
 */
export async function searchWeb(query) {
  const search = new SerpApi.GoogleSearch(serpApiKey);

  // Configure the parameters you need.
  // Docs: https://serpapi.com/search-api
  const params = {
    q: query,
    location: "United States", // or your desired location
    hl: "en",                  // language
    gl: "us",                  // country of the search
    // ...any other SerpApi parameters you need
  };

  return new Promise((resolve, reject) => {
    search.json(params, (data) => {
      resolve(data);
    }, (error) => {
      reject(error);
    });
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

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}