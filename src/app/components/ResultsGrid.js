"use client";

import { useState, useEffect } from "react";
import styles from "./ResultsGrid.module.css";
import Modal from "./Modal";

export default function ResultsGrid({ latestBatch }) {
	const [videoData, setVideoData] = useState(null);
	const [activeModal, setActiveModal] = useState(null);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [searchResults, setSearchResults] = useState(null);
	const [isSearchLoading, setIsSearchLoading] = useState(false);
	const [imageResults, setImageResults] = useState(null);
	const [isImageLoading, setIsImageLoading] = useState(false);

	useEffect(() => {
		const fetchVideoData = async (query) => {
			setIsLoading(true);
			try {
				const response = await fetch(
					`/api/youtube?query=${encodeURIComponent(query)}`
				);
				const data = await response.json();
				if (data.thumbnail) {
					setVideoData({
						thumbnail: data.thumbnail,
						title: data.title || "Related Video",
						videoId: data.videoId,
						description: data.description,
						relatedVideos: data.relatedVideos,
					});
				}
			} catch (error) {
				console.error("Error fetching video:", error);
			} finally {
				setIsLoading(false);
			}
		};

		const fetchSearchResults = async (query) => {
			setIsSearchLoading(true);
			try {
				console.log("Fetching search results for:", query);
				const response = await fetch(
					`/api/search?query=${encodeURIComponent(query)}`
				);
				const data = await response.json();
				console.log("Search results received:", data);
				setSearchResults(data);
			} catch (error) {
				console.error("Error fetching search results:", error);
			} finally {
				setIsSearchLoading(false);
			}
		};

		const fetchImageResults = async (query, type) => {
			setIsImageLoading(true);
			try {
				console.log(`Fetching ${type} image results for:`, query);
				const response = await fetch(
					`/api/image-search?query=${encodeURIComponent(query)}`
				);
				const data = await response.json();
				console.log(`${type} image results received:`, data);
				setImageResults((prev) => ({
					...prev,
					[type]: data.images_results || [],
				}));
			} catch (error) {
				console.error(`Error fetching ${type} images:`, error);
			} finally {
				setIsImageLoading(false);
			}
		};

		if (latestBatch) {
			// If we have a transcript, use it for search
			if (latestBatch.transcript) {
				fetchSearchResults(latestBatch.transcript);
			}

			// Handle video mentions separately
			if (latestBatch.mentions) {
				const videoMention = latestBatch.mentions.find(
					(m) => m.type.toLowerCase() === "video"
				);
				if (videoMention) {
					fetchVideoData(videoMention.searchQuery);
				}

				const celebrityMention = latestBatch.mentions.find(
					(m) => m.type.toLowerCase() === "celebrity"
				);
				if (celebrityMention) {
					fetchImageResults(
						celebrityMention.searchQuery,
						"celebrity"
					);
				}

				const productMention = latestBatch.mentions.find(
					(m) => m.type.toLowerCase() === "product"
				);
				if (productMention) {
					fetchImageResults(productMention.searchQuery, "product");
				}
			}
		}
	}, [latestBatch]);

	const renderModalContent = () => {
		switch (activeModal) {
			case "factCheck":
				return (
					<div className={styles.modalContent}>
						<h2>Fact Check Details</h2>
						<div
							className={`${styles.status} ${
								latestBatch.factCheck.factCheck
									? styles.true
									: styles.false
							}`}
						>
							{latestBatch.factCheck.factCheck
								? "✓ Verified"
								: "⚠ Needs Review"}
						</div>
						<p className={styles.modalText}>
							{latestBatch.factCheck.text}
						</p>
					</div>
				);
			case "video":
				return (
					videoData && (
						<div className={styles.modalContent}>
							<h2>{videoData.title}</h2>
							<div className={styles.modalVideo}>
								<iframe
									className={styles.videoIframe}
									src={`https://www.youtube.com/embed/${videoData.videoId}?autoplay=1`}
									title="YouTube video player"
									frameBorder="0"
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
									allowFullScreen
								></iframe>
							</div>
							<p className={styles.videoDescription}>
								{videoData.description}
							</p>
							<div className={styles.relatedVideos}>
								<h3>Related Videos</h3>
								<div className={styles.relatedVideosGrid}>
									{videoData.relatedVideos.map((video) => (
										<button
											key={video.id}
											className={
												styles.relatedVideoButton
											}
											onClick={() => {
												setVideoData({
													...videoData,
													title: video.title,
													videoId: video.id,
													thumbnail: video.thumbnail,
												});
											}}
										>
											<img
												src={video.thumbnail}
												alt={video.title}
												className={
													styles.relatedThumbnail
												}
											/>
											<span
												className={styles.relatedTitle}
											>
												{video.title}
											</span>
										</button>
									))}
								</div>
							</div>
						</div>
					)
				);
			case "search":
				return (
					searchResults && (
						<div className={styles.modalContent}>
							<h2>Search Results</h2>
							<div className={styles.searchResultsModal}>
								{searchResults.organic_results.map(
									(result, index) => (
										<div
											key={index}
											className={styles.searchResult}
										>
											<a
												href={result.link}
												target="_blank"
												rel="noopener noreferrer"
												className={styles.searchLink}
											>
												{result.title}
											</a>
											<p className={styles.searchSnippet}>
												{result.snippet}
											</p>
											{result.thumbnail && (
												<img
													src={result.thumbnail}
													alt={result.title}
													className={
														styles.searchThumbnail
													}
												/>
											)}
										</div>
									)
								)}
							</div>
						</div>
					)
				);
			case "celebrity-images":
			case "product-images":
				const type = activeModal.split("-")[0];
				return (
					imageResults?.[type] && (
						<div className={styles.modalContent}>
							<h2>
								{type === "celebrity"
									? "Celebrity Images"
									: "Product Images"}
							</h2>
							<div className={styles.imageResultsGrid}>
								{imageResults[type].map((image, index) => (
									<div
										key={index}
										className={styles.imageResult}
									>
										<img
											src={image.thumbnail}
											alt={image.title}
											className={styles.modalImage}
										/>
										<p className={styles.imageTitle}>
											{image.title}
										</p>
									</div>
								))}
							</div>
						</div>
					)
				);
			default:
				return null;
		}
	};

	const renderVideoSquare = () => {
		const hasVideoMention = latestBatch?.mentions?.some(
			(m) => m.type.toLowerCase() === "video"
		);

		if (isLoading && hasVideoMention) {
			return (
				<div className={styles.loadingSquare}>
					<svg
						className={styles.loadingSpinner}
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						/>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
					<span>Loading video data...</span>
				</div>
			);
		}

		if (videoData) {
			return (
				<div className={styles.videoSquare}>
					<img src={videoData.thumbnail} alt="Video thumbnail" />
					<div className={styles.videoTitle}>{videoData.title}</div>
				</div>
			);
		}

		return null;
	};

	const renderSearchSquare = () => {
		if (isSearchLoading) {
			return (
				<div className={styles.loadingSquare}>
					<svg
						className={styles.loadingSpinner}
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						/>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
					<span>Loading search results...</span>
				</div>
			);
		}

		if (searchResults?.organic_results?.length > 0) {
			const topResult = searchResults.organic_results[0];
			return (
				<div className={styles.searchSquare}>
					<h3>Top Result</h3>
					<a
						href={topResult.link}
						target="_blank"
						rel="noopener noreferrer"
						className={styles.searchLink}
					>
						{topResult.title}
					</a>
					<p className={styles.searchSnippet}>{topResult.snippet}</p>
					{topResult.thumbnail && window.innerHeight > 600 && (
						<img
							src={topResult.thumbnail}
							alt={topResult.title}
							className={styles.searchThumbnail}
						/>
					)}
				</div>
			);
		}

		return null;
	};

	const renderImageSquare = (type) => {
		if (isImageLoading) {
			return (
				<div className={styles.loadingSquare}>
					<svg
						className={styles.loadingSpinner}
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						/>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
					<span>Loading images...</span>
				</div>
			);
		}

		const results = imageResults?.[type] || [];
		if (results.length > 0) {
			const topImage = results[0];
			return (
				<img
					src={topImage.thumbnail}
					alt={topImage.title}
					className={styles.gridImage}
				/>
			);
		}

		return null;
	};

	// Helper function to render active squares and fill remaining with empty squares
	const renderGridSquares = () => {
		const squares = [];

		// Only add fact check if it exists
		if (latestBatch?.factCheck) {
			squares.push(
				<div
					key="factCheck"
					className={`${styles.gridSquare} ${styles.clickable}`}
					onClick={() => setActiveModal("factCheck")}
				>
					<div className={styles.factCheckSquare}>
						<h3>Fact Check</h3>
						<div
							className={`${styles.status} ${
								latestBatch.factCheck.factCheck
									? styles.true
									: styles.false
							}`}
						>
							{latestBatch.factCheck.factCheck
								? "✓ Verified"
								: "⚠ Needs Review"}
						</div>
						<p>{latestBatch.factCheck.text}</p>
					</div>
				</div>
			);
		}

		// Only add video if it exists
		if (videoData) {
			squares.push(
				<div
					key="video"
					className={`${styles.gridSquare} ${styles.clickable}`}
					onClick={() => setActiveModal("video")}
				>
					{renderVideoSquare()}
				</div>
			);
		}

		// Only add search if it has results
		if (searchResults?.organic_results?.length > 0) {
			squares.push(
				<div
					key="search"
					className={`${styles.gridSquare} ${styles.clickable}`}
					onClick={() => setActiveModal("search")}
				>
					{renderSearchSquare()}
				</div>
			);
		}

		// Add celebrity images if available
		if (imageResults?.celebrity?.length > 0) {
			squares.push(
				<div
					key="celebrity-images"
					className={`${styles.gridSquare} ${styles.clickable}`}
					onClick={() => setActiveModal("celebrity-images")}
				>
					{renderImageSquare("celebrity")}
				</div>
			);
		}

		// Add product images if available
		if (imageResults?.product?.length > 0) {
			squares.push(
				<div
					key="product-images"
					className={`${styles.gridSquare} ${styles.clickable}`}
					onClick={() => setActiveModal("product-images")}
				>
					{renderImageSquare("product")}
				</div>
			);
		}

		// Fill remaining squares (up to 6 total)
		const emptySquaresNeeded = 6 - squares.length;
		for (let i = 0; i < emptySquaresNeeded; i++) {
			squares.push(
				<div key={`empty-${i}`} className={styles.gridSquare}></div>
			);
		}

		return squares;
	};

	return (
		<>
			<div className={styles.gridHeader}>
				<button
					className={styles.fullscreenButton}
					onClick={() => setIsFullscreen(true)}
				>
					<svg
						className={styles.expandIcon}
						viewBox="0 0 24 24"
						width="24"
						height="24"
					>
						<path
							fill="currentColor"
							d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"
						/>
					</svg>
					Expand Grid
				</button>
			</div>

			<div
				className={`${styles.gridContainer} ${
					isFullscreen ? styles.fullscreen : ""
				}`}
			>
				{renderGridSquares()}
			</div>

			{isFullscreen && (
				<div className={styles.fullscreenOverlay}>
					<button
						className={styles.exitFullscreenButton}
						onClick={() => setIsFullscreen(false)}
					>
						<svg
							className={styles.collapseIcon}
							viewBox="0 0 24 24"
							width="24"
							height="24"
						>
							<path
								fill="currentColor"
								d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"
							/>
						</svg>
						Exit Fullscreen
					</button>
					<div className={styles.fullscreenGrid}>
						{renderGridSquares()}
					</div>
				</div>
			)}

			<Modal isOpen={!!activeModal} onClose={() => setActiveModal(null)}>
				{renderModalContent()}
			</Modal>
		</>
	);
}
