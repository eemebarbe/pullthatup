"use client";

import { useState, useEffect } from "react";
import styles from "./VoiceRecorder.module.css";
import ResultsGrid from "./ResultsGrid";

export default function VoiceRecorder() {
	const [isRecording, setIsRecording] = useState(false);
	const [transcriptPairs, setTranscriptPairs] = useState([]); // Array of {transcript, factCheck, categories}
	const [currentTranscript, setCurrentTranscript] = useState(""); // For real-time display
	const [processedText, setProcessedText] = useState(new Set()); // Track processed text
	const [pendingBatches, setPendingBatches] = useState([]); // New state for batches waiting to be processed
	const [recognition, setRecognition] = useState(null);
	const [error, setError] = useState("");
	const [retryCount, setRetryCount] = useState(0);
	const WORD_BATCH_SIZE = 15;
	const MAX_RETRIES = 3;
	const [activeTab, setActiveTab] = useState("transcript");

	useEffect(() => {
		return () => {
			if (recognition) {
				recognition.stop();
			}
		};
	}, [recognition]);

	const summarizeText = async (text) => {
		try {
			const response = await fetch("/api/summarize", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ text }),
			});

			// Check if response is JSON
			const contentType = response.headers.get("content-type");
			if (!contentType || !contentType.includes("application/json")) {
				throw new Error("Server returned non-JSON response");
			}

			const data = await response.json();
			console.log("API Response:", data); // Debug log

			if (!response.ok) {
				throw new Error(data.error || "Failed to process text");
			}

			// Ensure categories is an array
			const categories = Array.isArray(data.categories)
				? data.categories
				: [];
			console.log("Processed categories:", categories); // Debug log

			return {
				factCheck: data.factCheck || {
					factCheck: false,
					text: "No claims to verify.",
				},
				categories: categories,
				mentions: Array.isArray(data.mentions) ? data.mentions : [],
			};
		} catch (error) {
			console.error("Error processing text:", error);
			setError(`Error: ${error.message}`);
			return {
				factCheck: {
					factCheck: false,
					text: "Unable to fact-check this text.",
				},
				categories: [],
				mentions: [],
			};
		}
	};

	// Modified to add to pending batches instead of processing directly
	const addTranscriptBatch = (text) => {
		// Don't clear currentTranscript until the batch is processed
		setPendingBatches((prev) => [...prev, text]);
	};

	// Modified useEffect to handle transcript processing
	useEffect(() => {
		const processBatches = async () => {
			// Process all pending batches concurrently
			const batchPromises = pendingBatches.map(async (text) => {
				if (!processedText.has(text)) {
					setProcessedText((prev) => new Set(prev).add(text));
					return await summarizeText(text);
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

	const initializeRecognition = () => {
		const SpeechRecognition =
			window.SpeechRecognition || window.webkitSpeechRecognition;
		const newRecognition = new SpeechRecognition();

		// Configure the recognition
		newRecognition.continuous = true;
		newRecognition.interimResults = true;
		newRecognition.lang = "en-US";

		let finalTranscriptBuffer = "";

		// Handle results
		newRecognition.onresult = (event) => {
			let interimTranscript = "";
			let finalTranscript = "";

			for (let i = event.resultIndex; i < event.results.length; i++) {
				const result = event.results[i];
				const transcript = result[0].transcript;

				if (result.isFinal) {
					finalTranscript += transcript;
				} else {
					interimTranscript += transcript;
				}
			}

			// Create a single setState call to avoid multiple updates
			setCurrentTranscript((prev) => {
				const updatedTranscript = (
					finalTranscriptBuffer +
					finalTranscript +
					interimTranscript
				).trim();
				const wordCount = updatedTranscript.split(/\s+/).length;
				console.log("wordCount", wordCount);

				// If we have enough words, process the batch immediately
				if (wordCount >= WORD_BATCH_SIZE) {
					addTranscriptBatch(updatedTranscript);
					finalTranscriptBuffer = ""; // Reset the buffer
					// Start new transcript with any remaining interim results
					return interimTranscript;
				}

				// If we have final transcript but not enough words yet, add to buffer
				if (finalTranscript) {
					finalTranscriptBuffer += finalTranscript;
				}

				return updatedTranscript;
			});

			setRetryCount(0);
		};

		// Handle errors
		newRecognition.onerror = (event) => {
			console.error("Speech recognition error:", event.error);

			if (event.error === "network") {
				setError(
					"Network error. Please check your internet connection."
				);
				if (retryCount < MAX_RETRIES) {
					setRetryCount((prev) => prev + 1);
					console.log(
						`Retrying... Attempt ${
							retryCount + 1
						} of ${MAX_RETRIES}`
					);
					// Wait a second before retrying
					setTimeout(() => {
						try {
							newRecognition.start();
						} catch (e) {
							stopRecording();
						}
					}, 1000);
					return;
				}
			}

			setError(`Error: ${event.error}`);
			stopRecording();
		};

		// Handle end of speech recognition
		newRecognition.onend = () => {
			// Only auto-restart if we're still supposed to be recording
			if (isRecording && retryCount < MAX_RETRIES) {
				try {
					newRecognition.start();
				} catch (e) {
					stopRecording();
				}
			} else {
				stopRecording();
			}
		};

		return newRecognition;
	};

	const startRecording = () => {
		setError("");
		setRetryCount(0);
		try {
			// Check browser support
			if (
				!("webkitSpeechRecognition" in window) &&
				!("SpeechRecognition" in window)
			) {
				throw new Error(
					"Speech recognition is not supported in this browser"
				);
			}

			const newRecognition = initializeRecognition();
			newRecognition.start();
			setRecognition(newRecognition);
			setIsRecording(true);
		} catch (err) {
			setError(err.message);
			console.error("Speech recognition error:", err);
		}
	};

	const stopRecording = () => {
		if (recognition) {
			recognition.stop();
			setRecognition(null);
			setIsRecording(false);
		}
	};

	return (
		<div className={styles.container}>
			<div className={styles.headerRow}>
				<h1 className={styles.title}>Pull That Up</h1>
				<button
					onClick={isRecording ? stopRecording : startRecording}
					className={`${styles.recordButton} ${
						isRecording ? styles.recording : styles.notRecording
					}`}
				>
					{isRecording ? "Stop Recording" : "Start Recording"}
				</button>
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
					onRecordingToggle={setIsRecording}
				/>
			)}
		</div>
	);
}
