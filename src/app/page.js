import Image from "next/image";
import styles from "./page.module.css";
import VoiceRecorder from "./components/VoiceRecorder";

export default function Home() {
	return (
		<div className={styles.page}>
			<main>
				<h1 className={styles.title}>AI Voice Fact Checker</h1>
				<VoiceRecorder />
			</main>
		</div>
	);
}
