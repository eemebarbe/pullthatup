"use client";

import dynamic from "next/dynamic";

const RecorderClient = dynamic(() => import("./RecorderClient"), {
	ssr: false,
});

export default function Recorder(props) {
	return <RecorderClient {...props} />;
}
