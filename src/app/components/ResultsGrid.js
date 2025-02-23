"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./ResultsGrid.module.css";
import Modal from "./Modal";

export default function ResultsGrid({
	latestBatch,
	isRecording,
	onRecordingToggle,
}) {
	const [videoData, setVideoData] = useState(null);
	const [activeModal, setActiveModal] = useState(null);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [searchResults, setSearchResults] = useState(null);
	const [isSearchLoading, setIsSearchLoading] = useState(false);
	const [imageResults, setImageResults] = useState(null);
	const [isImageLoading, setIsImageLoading] = useState(false);

	// Add a ref to track previous batch
	const previousBatchRef = useRef(null);

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

	// Add useEffect to detect batch changes
	useEffect(() => {
		if (latestBatch && latestBatch !== previousBatchRef.current) {
			// Reset animations by removing and re-adding animate class
			const squares = document.querySelectorAll(`.${styles.gridSquare}`);
			squares.forEach((square, index) => {
				square.classList.remove(styles.animate);
				// Force reflow
				void square.offsetWidth;
				square.classList.add(styles.animate);
			});
			previousBatchRef.current = latestBatch;
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

		// Create squares for expected content based on latestBatch
		if (latestBatch) {
			// Add fact check square if it exists
			if (latestBatch.factCheck) {
				squares.push(
					<div
						key="factCheck"
						className={`${styles.gridSquare} ${styles.clickable} ${styles.animate}`}
						onClick={() => setActiveModal("factCheck")}
					>
						<div className={styles.squareNumber}>1</div>
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

			// Add video square if there's a video mention
			if (
				latestBatch.mentions?.some(
					(m) => m.type.toLowerCase() === "video"
				)
			) {
				squares.push(
					<div
						key="video"
						className={`${styles.gridSquare} ${styles.clickable} ${styles.animate}`}
						onClick={() => videoData && setActiveModal("video")}
					>
						<div className={styles.squareNumber}>2</div>
						{renderVideoSquare() || (
							<div
								className={`${styles.loadingSquare} ${styles.video} ${styles.animate}`}
								data-loading-text="Loading video..."
							/>
						)}
					</div>
				);
			}

			// Add search square if there's a transcript
			if (latestBatch.transcript) {
				squares.push(
					<div
						key="search"
						className={`${styles.gridSquare} ${styles.clickable} ${styles.animate}`}
						onClick={() =>
							searchResults && setActiveModal("search")
						}
					>
						<div className={styles.squareNumber}>3</div>
						{renderSearchSquare() || (
							<div
								className={`${styles.loadingSquare} ${styles.search} ${styles.animate}`}
								data-loading-text="Loading search results..."
							/>
						)}
					</div>
				);
			}

			// Add celebrity image square if there's a celebrity mention
			if (
				latestBatch.mentions?.some(
					(m) => m.type.toLowerCase() === "celebrity"
				)
			) {
				squares.push(
					<div
						key="celebrity-images"
						className={`${styles.gridSquare} ${styles.clickable} ${styles.animate}`}
						onClick={() =>
							imageResults?.celebrity &&
							setActiveModal("celebrity-images")
						}
					>
						<div className={styles.squareNumber}>4</div>
						{renderImageSquare("celebrity") || (
							<div
								className={`${styles.loadingSquare} ${styles.image} ${styles.animate}`}
								data-loading-text="Loading celebrity images..."
							/>
						)}
					</div>
				);
			}

			// Add product image square if there's a product mention
			if (
				latestBatch.mentions?.some(
					(m) => m.type.toLowerCase() === "product"
				)
			) {
				squares.push(
					<div
						key="product-images"
						className={`${styles.gridSquare} ${styles.clickable} ${styles.animate}`}
						onClick={() =>
							imageResults?.product &&
							setActiveModal("product-images")
						}
					>
						<div className={styles.squareNumber}>5</div>
						{renderImageSquare("product") || (
							<div
								className={`${styles.loadingSquare} ${styles.image} ${styles.animate}`}
								data-loading-text="Loading product images..."
							/>
						)}
					</div>
				);
			}
		}

		// Fill remaining squares (up to 6 total)
		const emptySquaresNeeded = 6 - squares.length;
		for (let i = 0; i < emptySquaresNeeded; i++) {
			const squareNumber = squares.length + 1;
			squares.push(
				<div
					key={`empty-${i}`}
					className={`${styles.gridSquare} ${styles.animate}`}
				>
					<div className={styles.squareNumber}>{squareNumber}</div>
				</div>
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
					<div className={styles.fullscreenControls}>
						<button
							className={`${styles.recordingButton} ${
								isRecording ? styles.recording : ""
							}`}
							onClick={() => {
								// Call the parent's recording toggle function
								onRecordingToggle();
							}}
						>
							<div className={styles.recordingIcon} />
							{isRecording ? "Stop Recording" : "Start Recording"}
						</button>
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
					</div>
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
