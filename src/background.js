// background.js
/*
Background script to handle DeepL API calls
This script runs in the extension's background context where CORS restrictions don't apply
*/

// Listen for messages from content scripts
if (typeof browser !== 'undefined') {
  // Firefox - onMessage listener can return a Promise
  browser.runtime.onMessage.addListener(handleMessage);
} else {
  // Chrome - onMessage listener uses callback
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);
    return true; // Indicates we'll respond asynchronously
  });
}

async function handleMessage(request, sender, sendResponse) {
  if (request.action === 'translate') {
    try {
      const translatedText = await translateText(
        request.text,
        request.sourceLang,
        request.targetLang
      );

      const response = { translatedText };

      if (typeof browser !== 'undefined') {
        // Firefox - return Promise
        return Promise.resolve(response);
      } else {
        // Chrome - use sendResponse callback
        if (sendResponse) {
          sendResponse(response);
        }
        return response;
      }
    } catch (error) {
      console.error('Background script translation error:', error);
      const errorResponse = { error: error.message };

      if (typeof browser !== 'undefined') {
        // Firefox - return Promise
        return Promise.resolve(errorResponse);
      } else {
        // Chrome - use sendResponse callback
        if (sendResponse) {
          sendResponse(errorResponse);
        }
        return errorResponse;
      }
    }
  }

  async function translateText(text, sourceLang, targetLang) {
    try {
      // Get API key from storage
      const storage =
        typeof browser !== 'undefined'
          ? browser.storage.local
          : chrome.storage.local;

      const data = await new Promise((resolve, reject) => {
        storage.get(['deeplApiKey'], (result) => {
          if (
            chrome.runtime.lastError ||
            (typeof browser !== 'undefined' && browser.runtime.lastError)
          ) {
            reject(chrome.runtime.lastError || browser.runtime.lastError);
          } else {
            resolve(result);
          }
        });
      });

      const apiKey = data.deeplApiKey;

      if (!apiKey) {
        throw new Error(
          'DeepL API key is not available. Please set it in the extension popup.'
        );
      }

      const apiUrl = 'https://api-free.deepl.com/v2/translate';
      const requestPayload = {
        text: [text],
        target_lang: targetLang.toUpperCase(), // DeepL expects uppercase language codes
        source_lang: sourceLang ? sourceLang.toUpperCase() : undefined,
        preserve_formatting: true, // Use boolean instead of string
        tag_handling: 'html',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            'Authentication failed. Please check your DeepL API key.'
          );
        }
        const errorText = await response.text();
        console.error('Background.js: API Error Response:', errorText);
        throw new Error(
          `HTTP error! Status: ${response.status}, Response: ${errorText}`
        );
      }

      const responseData = await response.json();
      return responseData.translations[0].text;
    } catch (error) {
      console.error('Background.js: Error in translateText:', error);
      throw error;
    }
  }
}
