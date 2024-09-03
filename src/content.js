/*
Copyright 2023 Nito T.M.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Modifications made by Jashior, 03/09/2024.
- Integrated language detection module from eld.
*/

import { eld } from "./l-d/languageDetector.js";

let userMainLanguage;
let deeplApiKey;
let langSubset = [
  "en", // English
  "es", // Spanish
  "fr", // French
  "de", // German
  "it", // Italian
  "pt", // Portuguese
  "nl", // Dutch
  "ru", // Russian
  "pl", // Polish
  "ja", // Japanese
  "zh", // Chinese (Simplified)
  "ar", // Arabic
  "tr", // Turkish
  "da", // Danish
  "sv", // Swedish
  "no", // Norwegian
  "fi", // Finnish
  "cs", // Czech
  "hu", // Hungarian
  "ro", // Romanian
  "sk", // Slovak
  "bg", // Bulgarian
  "el", // Greek
  "he", // Hebrew
  "uk", // Ukrainian
  "hr", // Croatian
  "sl", // Slovenian
  "lt", // Lithuanian
  "lv", // Latvian
  "et", // Estonian
  "mk", // Macedonian
  "sr", // Serbian
  "bs", // Bosnian
  "ka", // Georgian
];

export default function () {
  initializeUserSettings(() => {
    processReviews();
  });
}

function initializeUserSettings(callback) {
  eld.dynamicLangSubset(langSubset);
  const storage =
    typeof browser !== "undefined"
      ? browser.storage.local
      : chrome.storage.local;

  storage.get(["targetLang", "deeplApiKey"], (data) => {
    if (
      chrome.runtime.lastError ||
      (typeof browser !== "undefined" && browser.runtime.lastError)
    ) {
      console.error(
        "Error retrieving user settings:",
        chrome.runtime.lastError || browser.runtime.lastError
      );
      userMainLanguage = "en";
      deeplApiKey = null;
      callback();
      return;
    }

    userMainLanguage = data.targetLang || "en";
    deeplApiKey = data.deeplApiKey || null;
    callback();
  });
}

function extractReviewText(reviewElement) {
  const bodyText = reviewElement.querySelector(".body-text");
  if (!bodyText) return null;

  const collapsedText = bodyText.querySelector(".collapsed-text");
  if (collapsedText) {
    return collapsedText.textContent.trim();
  } else {
    return bodyText.textContent.trim();
  }
}

// content.js or popup.js
function translateText(text, sourceLang, targetLang) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "translate",
        text: text,
        sourceLang: sourceLang,
        targetLang: targetLang,
      },
      (response) => {
        if (response.error) {
          console.error("Translation error:", response.error);
          reject(response.error);
        } else {
          resolve(response.translatedText);
        }
      }
    );
  });
}
// content.js
function addTranslateButton(reviewElement, reviewText, sourceLang) {
  let contentContainer = reviewElement.querySelector(".film-detail-content");

  if (!contentContainer) {
    return;
  }

  let translateButton = contentContainer.querySelector(".translate-button");

  if (!translateButton) {
    translateButton = document.createElement("button");
    translateButton.className = "translate-button";
    translateButton.textContent = "Translate Review";
    translateButton.style.marginTop = "10px";
    translateButton.style.padding = "5px 10px";
    translateButton.style.backgroundColor = "#00C030";
    translateButton.style.color = "#99AABB";
    translateButton.style.fontFamily = "TiemposTextWeb-Regular,Georgia,serif";
    translateButton.style.fontSize = "1rem";
    translateButton.style.lineHeight = "1";
    translateButton.style.color = "white";
    translateButton.style.border = "none";
    translateButton.style.borderRadius = "3px";
    translateButton.style.cursor = "pointer";

    translateButton.addEventListener("click", async () => {
      try {
        // Await the result from translateText
        const translatedText = await translateText(
          reviewText,
          sourceLang,
          userMainLanguage
        );

        // Create a new element to display the translated text
        const translatedElement = document.createElement("div");
        translatedElement.textContent = translatedText;
        translatedElement.style.marginTop = "10px";
        translatedElement.style.fontFamily =
          "TiemposTextWeb-Regular,Georgia,serif";
        translatedElement.style.fontSize = "1.15384615rem";
        translatedElement.style.lineHeight = "1.6";
        contentContainer.appendChild(translatedElement);

        // Hide the translate button after translation
        translateButton.style.display = "none";
      } catch (error) {
        console.error("Error during translation:", error);
        const errorElement = document.createElement("div");
        errorElement.textContent = `Failed to translate text: ${error}`;
        errorElement.style.marginTop = "10px";
        errorElement.style.color = "red";
        contentContainer.appendChild(errorElement);
      }
    });

    contentContainer.appendChild(translateButton);
  }
}

async function processReview(reviewElement) {
  const moreLink = reviewElement.querySelector(".collapsed-text");
  if (moreLink) {
    return;
  }

  const reviewText = extractReviewText(reviewElement);
  if (!reviewText) {
    return;
  }

  try {
    const response = eld.detect(reviewText);
    if (response.language !== userMainLanguage) {
      console.log(
        `${response.language}: ${response.getScores()[response.language]}`
      );
      if (response.getScores()[response.language] > 0.35) {
        addTranslateButton(reviewElement, reviewText, response.language);
      }
    } else {
    }
  } catch (error) {
    console.error("Error processing review:", error);
  }
}

function processReviews() {
  const reviewElements = document.querySelectorAll(".film-detail");
  reviewElements.forEach(processReview);
}

function handleReviewExpansion(mutationsList, observer) {
  for (let mutation of mutationsList) {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          node.classList.contains("body-text")
        ) {
          const reviewElement = node.closest(".film-detail");
          if (reviewElement) {
            processReview(reviewElement);
          }
        }
      });
    }
  }
}

const observer = new MutationObserver(handleReviewExpansion);
observer.observe(document.body, { childList: true, subtree: true });

document.addEventListener("click", function (event) {
  if (event.target.classList.contains("reveal")) {
    const reviewElement = event.target.closest(".film-detail");
    if (reviewElement) {
      setTimeout(() => processReview(reviewElement), 500); // Wait for expansion to complete
    }
  }
});
