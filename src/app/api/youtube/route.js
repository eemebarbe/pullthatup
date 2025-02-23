import { NextResponse } from "next/server";

export async function GET(request) {
	const { searchParams } = new URL(request.url);
	const query = searchParams.get("query");

	if (!query) {
		return NextResponse.json(
			{ error: "Query parameter is required" },
			{ status: 400 }
		);
	}

	try {
		// First fetch the main video
		const mainResponse = await fetch(
			`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
				query
			)}&key=${process.env.YOUTUBE_API_KEY}&maxResults=7&type=video`,
			{
				headers: {
					Accept: "application/json",
				},
			}
		);

		const data = await mainResponse.json();

		if (!mainResponse.ok) {
			throw new Error(
				data.error?.message || "Failed to fetch YouTube data"
			);
		}

		if (data.items && data.items.length > 0) {
			const mainVideo = data.items[0];
			const relatedVideos = data.items.slice(1).map((item) => ({
				id: item.id.videoId,
				title: item.snippet.title,
				thumbnail: item.snippet.thumbnails.default.url,
			}));

			// Fetch detailed info for main video to get description
			const detailsResponse = await fetch(
				`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${mainVideo.id.videoId}&key=${process.env.YOUTUBE_API_KEY}`,
				{
					headers: {
						Accept: "application/json",
					},
				}
			);

			const detailsData = await detailsResponse.json();
			const description =
				detailsData.items?.[0]?.snippet?.description || "";

			return NextResponse.json({
				thumbnail: mainVideo.snippet.thumbnails.medium.url,
				title: mainVideo.snippet.title,
				videoId: mainVideo.id.videoId,
				description,
				relatedVideos,
			});
		}

		return NextResponse.json({ thumbnail: null, title: null });
	} catch (error) {
		console.error("YouTube API error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch video data" },
			{ status: 500 }
		);
	}
}
