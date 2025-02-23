"use client";

import React, { useEffect, useState } from "react";
import useSpeechToText, { ResultType } from "react-hook-speech-to-text";
import styles from "./RecorderClient.module.css";

export default function RecorderClient({
  onTranscript,
  setIsRecording,
}: {
  onTranscript: (transcript: string) => void;
  setIsRecording: (isRecording: boolean) => void;
}) {
  const {
    error,
    interimResult,
    isRecording,
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
      setIsRecording(false
      );
    },
  });
  
  const [resultsStreamed, setResultsStreamed] = useState([]);

  useEffect(() => {
    // Stream results one by one
    if (results.length > resultsStreamed.length) {
      console.log("New results:", results);
      const newResults = results.slice(resultsStreamed.length);
      setResultsStreamed([...resultsStreamed, ...newResults]);
      onTranscript((newResults[newResults.length - 1] as ResultType).transcript);
    }
  }, [results, resultsStreamed]);

  return (
    <div>
      <button
        className={`${styles.recordButton} ${
          isRecording ? styles.recording : styles.notRecording
        }`}
        onClick={isRecording ? stopSpeechToText : startSpeechToText}
      >
        {isRecording ? "Stop" : "Start"}
      </button>
    </div>
  );
}
