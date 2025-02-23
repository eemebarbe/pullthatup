"use client";

import React, { useState, useEffect } from "react";
import styles from "./VoiceRecorder.module.css";
import ResultsGrid from "./ResultsGrid";
import Recorder from "./Recorder";

interface RequestIntent {
	type: "open_modal" | "close_modal" | "more_info" | null;
	gridNumber?: number;
	topic?: string;
}

export default function VoiceRecorder() {
	const [isRecording, setIsRecording] = useState(false);
	const [transcriptPairs, setTranscriptPairs] = useState([]); // Array of {transcript, factCheck, categories}
	const [currentTranscript, setCurrentTranscript] = useState(""); // For real-time display
	const [processedText, setProcessedText] = useState(new Set()); // Track processed text
	const [pendingBatches, setPendingBatches] = useState([]); // New state for batches waiting to be processed
	const [error, setError] = useState("");
	const [triggerWord, setTriggerWord] = useState("jamie");
	const WORD_BATCH_SIZE = 15;
	const [activeTab, setActiveTab] = useState("transcript");
	const [isProcessingCommand, setIsProcessingCommand] = useState(false);

	const summarizeText = async (text: string) => {
		try {
			// Get content analysis
			const summaryResponse = await fetch("/api/summarize", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					text,
					triggerWord,
					recentBatches: transcriptPairs
						.slice(0, 5)
						.map((p) => p.transcript),
				}),
			});

			// Get fact check
			const factCheckResponse = await fetch("/api/fact-check", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ text }),
			});

			const summaryData = await summaryResponse.json();
			const factCheckData = await factCheckResponse.json();

			// Combine the responses
			return {
				...summaryData,
				...factCheckData,
			};
		} catch (error) {
			console.error("Error processing text:", error);
			return {
				factCheck: {
					factCheck: false,
					text: "Unable to verify claims at this time.",
				},
				categories: [],
				mentions: [],
				requestIntent: { type: null },
			};
		}
	};

	const onTranscript = async (text: string) => {
		console.log("📝 Transcript received:", {
			text,
			isProcessingCommand,
			willProcess: !(text === "" || isProcessingCommand),
		});

		if (text === "" || isProcessingCommand) {
			return;
		}
		setPendingBatches((prev) => [...prev, text]);
	};

	// Modified useEffect to handle transcript processing
	useEffect(() => {
		const processBatches = async () => {
			// Process all pending batches concurrently
			const batchPromises = pendingBatches.map(async (text) => {
				if (!processedText.has(text)) {
					setProcessedText((prev) => new Set(prev).add(text));
					const result = await summarizeText(text);
					// Add logging here
					console.log("🔍 Summarizer Response:", {
						text,
						result,
						factCheck: result.factCheck,
						categories: result.categories,
						mentions: result.mentions,
						requestIntent: result.requestIntent,
					});
					return result;
				}
				return null;
			});

			try {
				const results = await Promise.all(batchPromises);

				// Filter out null results and update transcriptPairs
				const validResults = results.filter((result, index) => {
					return (
						result !== null &&
						!processedText.has(pendingBatches[index])
					);
				});

				if (validResults.length > 0) {
					setTranscriptPairs((prev) => [
						...validResults.map((result, index) => ({
							transcript: pendingBatches[index],
							factCheck: result.factCheck,
							categories: result.categories,
							mentions: result.mentions,
							requestIntent: result.requestIntent,
						})),
						...prev,
					]);
				}

				// Clear all processed batches
				setPendingBatches([]);
			} catch (error) {
				console.error("Error processing batches:", error);
				setError("Error processing speech batches");
			}
		};

		if (pendingBatches.length > 0) {
			processBatches();
		}
	}, [pendingBatches]); // Remove processedText from dependencies

	const handleRecordingToggle = (newState) => {
		// If newState is provided, use it. Otherwise, toggle the current state
		setIsRecording(typeof newState === "boolean" ? newState : !isRecording);
	};

	// Add function to clear request intent
	const clearRequestIntent = () => {
		if (transcriptPairs[0]?.requestIntent) {
			setTranscriptPairs((prev) => [
				{ ...prev[0], requestIntent: { type: null } },
				...prev.slice(1),
			]);
		}
	};

	return (
		<div className={styles.container}>
			<div className={styles.headerRow}>
				<h1 className={styles.title}>Pull That Up</h1>
				<div className={styles.recorderControls}>
					<input
						type="text"
						value={triggerWord}
						onChange={(e) => setTriggerWord(e.target.value)}
						className={styles.triggerInput}
						placeholder="Trigger word..."
					/>
					<Recorder
						onTranscript={onTranscript}
						setIsRecording={handleRecordingToggle}
						isRecording={isRecording}
						triggerWord={triggerWord}
					/>
				</div>
			</div>

			{error && <div className={styles.error}>{error}</div>}

			{isRecording && (
				<div className={styles.recordingStatus}>
					<div className={styles.recordingIndicator} />
					Recording in progress...
				</div>
			)}

			<div className={styles.tabContainer}>
				<button
					className={`${styles.tabButton} ${
						activeTab === "transcript" ? styles.activeTab : ""
					}`}
					onClick={() => setActiveTab("transcript")}
				>
					Transcript
				</button>
				<button
					className={`${styles.tabButton} ${
						activeTab === "grid" ? styles.activeTab : ""
					}`}
					onClick={() => setActiveTab("grid")}
				>
					Results Grid
				</button>
			</div>

			{activeTab === "transcript" ? (
				<div className={styles.grid}>
					<div className={styles.headers}>
						<div className={styles.headerCell}>Transcripts</div>
						<div className={styles.headerCell}>Fact Check</div>
						<div className={styles.headerCell}>Categories</div>
						<div className={styles.headerCell}>Mentions</div>
					</div>

					<div>
						{currentTranscript && (
							<div className={styles.row}>
								<div className={styles.cell}>
									<div className={styles.currentTranscript}>
										{currentTranscript}
										<div className={styles.wordCount}>
											<div
												className={
													styles.recordingIndicator
												}
											/>
											Words:{" "}
											{
												currentTranscript
													.trim()
													.split(/\s+/).length
											}{" "}
											/ {WORD_BATCH_SIZE}
										</div>
									</div>
								</div>
								<div className={styles.cell}>
									<div className={styles.waitingStatus}>
										<svg
											className={styles.spinner}
											width="20"
											height="20"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
												fill="none"
											/>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											/>
										</svg>
										Analyzing...
									</div>
								</div>
								<div className={styles.cell}>
									<div className={styles.waitingStatus}>
										Waiting for analysis...
									</div>
								</div>
							</div>
						)}

						{transcriptPairs.map((pair, index) => (
							<div key={index} className={styles.row}>
								<div className={styles.cell}>
									{pair.transcript}
								</div>
								<div className={styles.cell}>
									<div className={styles.factCheckResult}>
										<div className={styles.factCheckStatus}>
											<span
												className={
													pair.factCheck.factCheck
														? styles.factCheckTrue
														: styles.factCheckFalse
												}
											>
												{pair.factCheck.factCheck
													? "No Issues Found"
													: "Needs Correction"}
											</span>
										</div>
										<div className={styles.factCheckText}>
											{pair.factCheck.factCheck
												? "No claims require verification."
												: pair.factCheck.text}
										</div>
									</div>
								</div>
								<div className={styles.cell}>
									<div className={styles.categories}>
										{pair.categories.length > 0 ? (
											pair.categories.map(
												(category, i) => (
													<span
														key={i}
														className={
															styles.category
														}
													>
														{category}
													</span>
												)
											)
										) : (
											<span
												className={styles.noCategories}
											>
												No categories
											</span>
										)}
									</div>
								</div>
								<div className={styles.cell}>
									<div className={styles.mentions}>
										{pair.mentions &&
										pair.mentions.length > 0 ? (
											pair.mentions.map((mention, i) => (
												<div
													key={i}
													className={styles.mention}
												>
													<span
														className={
															styles.mentionType
														}
													>
														{mention.type}:
													</span>
													<span
														className={
															styles.mentionQuery
														}
													>
														{mention.searchQuery}
													</span>
												</div>
											))
										) : (
											<span className={styles.noMentions}>
												No mentions detected
											</span>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			) : (
				<ResultsGrid
					latestBatch={transcriptPairs[0]}
					isRecording={isRecording}
					onRecordingToggle={handleRecordingToggle}
					transcriptPairs={transcriptPairs}
					onModalClose={clearRequestIntent}
				/>
			)}
		</div>
	);
}
