"use client";

import { useState, useEffect } from "react";
import styles from "./ResultsGrid.module.css";
import Modal from "./Modal";

export default function ResultsGrid({ latestBatch }) {
	const [videoData, setVideoData] = useState(null);
	const [activeModal, setActiveModal] = useState(null);

	useEffect(() => {
		const fetchVideoData = async (query) => {
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
			}
		};

		if (latestBatch?.mentions) {
			const videoMention = latestBatch.mentions.find(
				(m) => m.type.toLowerCase() === "video"
			);
			if (videoMention) {
				fetchVideoData(videoMention.searchQuery);
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
			default:
				return null;
		}
	};

	return (
		<div className={styles.gridContainer}>
			{/* Fact Check Square */}
			<div
				className={`${styles.gridSquare} ${styles.clickable}`}
				onClick={() =>
					latestBatch?.factCheck && setActiveModal("factCheck")
				}
			>
				{latestBatch?.factCheck && (
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
				)}
			</div>

			{/* Video Square */}
			<div
				className={`${styles.gridSquare} ${styles.clickable}`}
				onClick={() => videoData && setActiveModal("video")}
			>
				{videoData && (
					<div className={styles.videoSquare}>
						<img src={videoData.thumbnail} alt="Video thumbnail" />
						<div className={styles.videoTitle}>
							{videoData.title}
						</div>
					</div>
				)}
			</div>

			{/* Additional squares for future use */}
			<div className={styles.gridSquare}></div>
			<div className={styles.gridSquare}></div>
			<div className={styles.gridSquare}></div>
			<div className={styles.gridSquare}></div>

			<Modal isOpen={!!activeModal} onClose={() => setActiveModal(null)}>
				{renderModalContent()}
			</Modal>
		</div>
	);
}
