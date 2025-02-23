"use client";

import React, { useEffect, useState } from "react";
import useSpeechToText, { ResultType } from "react-hook-speech-to-text";
import styles from "./RecorderClient.module.css";

export default function RecorderClient({
	onTranscript,
	setIsRecording,
	isRecording: externalIsRecording,
}: {
	onTranscript: (transcript: string) => void;
	setIsRecording: (isRecording: boolean) => void;
	isRecording: boolean;
}) {
	const {
		error,
		interimResult,
		isRecording: speechToTextIsRecording,
		results,
		startSpeechToText,
		stopSpeechToText,
	} = useSpeechToText({
		continuous: true,
		crossBrowser: true,
		googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_CLOUD_API_KEY,
		speechRecognitionProperties: { interimResults: true },
		useLegacyResults: false,
		onStartSpeaking: () => {
			setIsRecording(true);
		},
		onStoppedSpeaking: () => {
			setIsRecording(false);
		},
	});

	const [resultsStreamed, setResultsStreamed] = useState([]);

	useEffect(() => {
		// Stream results one by one
		if (results.length > resultsStreamed.length) {
			const newResults = results.slice(resultsStreamed.length);
			setResultsStreamed([...resultsStreamed, ...newResults]);
			onTranscript(
				(newResults[newResults.length - 1] as ResultType).transcript
			);
		}
	}, [results, resultsStreamed]);

	useEffect(() => {
		if (externalIsRecording && !speechToTextIsRecording) {
			startSpeechToText();
		} else if (!externalIsRecording && speechToTextIsRecording) {
			stopSpeechToText();
		}
	}, [externalIsRecording, speechToTextIsRecording]);

	return (
		<div>
			<button
				className={`${styles.recordButton} ${
					externalIsRecording ? styles.recording : styles.notRecording
				}`}
				onClick={() => setIsRecording(!externalIsRecording)}
			>
				{externalIsRecording ? "Stop" : "Start"}
			</button>
		</div>
	);
}
