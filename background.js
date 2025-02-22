chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.type === "summarize") {
		// Use Chrome's experimental summarizer API
		chrome.scripting
			.executeScript({
				target: { tabId: sender.tab.id },
				function: async () => {
					try {
						const summary = await chrome.summarization.summarize(
							request.data.text
						);
						return { summary };
					} catch (error) {
						return { error: error.message };
					}
				},
			})
			.then(sendResponse);
		return true;
	}
});
