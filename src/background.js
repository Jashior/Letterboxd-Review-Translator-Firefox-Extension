// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "translate") {
    translateText(message.text, message.sourceLang, message.targetLang)
      .then((translatedText) => sendResponse({ translatedText }))
      .catch((error) => sendResponse({ error: error.message }));

    // Return true to indicate that sendResponse will be called asynchronously
    return true;
  }
});

async function translateText(text, sourceLang, targetLang) {
  // Retrieve API key from storage
  const { deeplApiKey } = await chrome.storage.local.get("deeplApiKey");

  if (!deeplApiKey) {
    throw new Error("DeepL API key is not available.");
  }

  const apiUrl = "https://api-free.deepl.com/v2/translate";
  const requestPayload = {
    text: [text],
    target_lang: targetLang,
    source_lang: sourceLang || undefined,
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${deeplApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestPayload),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  return data.translations[0].text;
}
