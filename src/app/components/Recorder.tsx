"use client";

import dynamic from "next/dynamic";

const RecorderClient = dynamic(() => import("./RecorderClient"), {
	ssr: false,
});

interface RecorderProps {
	onTranscript: (text: string) => void;
	setIsRecording: (isRecording: boolean) => void;
	isRecording: boolean;
	triggerWord: string;
}

export default function Recorder({
	onTranscript,
	setIsRecording,
	isRecording,
	triggerWord,
}: RecorderProps) {
	return (
		<RecorderClient
			{...{ onTranscript, setIsRecording, isRecording, triggerWord }}
		/>
	);
}
