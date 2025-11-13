// content.js
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

import { eld } from './l-d/languageDetector.js';

let userMainLanguage;
let deeplApiKey;
let langSubset = [
  'en', // English
  'es', // Spanish
  'fr', // French
  'de', // German
  'it', // Italian
  'pt', // Portuguese
  'nl', // Dutch
  'ru', // Russian
  'pl', // Polish
  'ja', // Japanese
  'zh', // Chinese (Simplified)
  'ar', // Arabic
  'tr', // Turkish
  'da', // Danish
  'sv', // Swedish
  'no', // Norwegian
  'fi', // Finnish
  'cs', // Czech
  'hu', // Hungarian
  'ro', // Romanian
  'sk', // Slovak
  'bg', // Bulgarian
  'el', // Greek
  'he', // Hebrew
  'uk', // Ukrainian
  'hr', // Croatian
  'sl', // Slovenian
  'lt', // Lithuanian
  'lv', // Latvian
  'et', // Estonian
  'mk', // Macedonian
  'sr', // Serbian
  'bs', // Bosnian
  'ka', // Georgian
];

export default function () {
  injectCss();
  initializeUserSettings(() => {
    processReviews();
    processComments();
  });
}

function injectCss() {
  const styleId = 'review-translator-styles';
  if (document.getElementById(styleId)) {
    return;
  }
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .translator-spinner {
      animation: translator-rotate 2s linear infinite;
      width: 1em;
      height: 1em;
      vertical-align: middle;
    }
    .translator-spinner .path {
      stroke: #6699CC;
      stroke-linecap: round;
      animation: translator-dash 1.5s ease-in-out infinite;
    }
    @keyframes translator-rotate {
      100% { transform: rotate(360deg); }
    }
    @keyframes translator-dash {
      0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
      50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
      100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
    }
    .translator-fade-in {
      animation: translator-fadeIn 0.5s ease-in-out;
    }
    @keyframes translator-fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}



function initializeUserSettings(callback) {
  eld.dynamicLangSubset(langSubset);
  const storage =
    typeof browser !== 'undefined'
      ? browser.storage.local
      : chrome.storage.local;

  storage.get(['targetLang', 'deeplApiKey'], (data) => {
    if (
      chrome.runtime.lastError ||
      (typeof browser !== 'undefined' && browser.runtime.lastError)
    ) {
      console.error(
        'Error retrieving user settings:',
        chrome.runtime.lastError || browser.runtime.lastError
      );
      userMainLanguage = 'en';
      deeplApiKey = null;
      callback();
      return;
    }

    userMainLanguage = normalizeLanguage(data.targetLang);
    deeplApiKey = data.deeplApiKey || null;
    callback();
  });
}

function normalizeLanguage(lang, fallback = 'en') {
  if (!lang || typeof lang !== 'string') {
    return fallback;
  }
  return lang.toLowerCase().split('-')[0];
}

// Message passing to background script for API calls
async function translateText(text, sourceLang, targetLang) {
  try {
    // Use message passing to communicate with background script
    let response;

    if (typeof browser !== 'undefined') {
      // Firefox - browser.runtime.sendMessage returns a Promise
      response = await browser.runtime.sendMessage({
        action: 'translate',
        text: text,
        sourceLang: sourceLang,
        targetLang: targetLang,
      });
    } else {
      // Chrome - use callback-based approach
      response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'translate',
            text: text,
            sourceLang: sourceLang,
            targetLang: targetLang,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          }
        );
      });
    }

    if (response.error) {
      throw new Error(response.error);
    }

    return response.translatedText;
  } catch (error) {
    console.error('Error in translateText:', error);
    throw error;
  }
}

function createAndAttachTranslateButton(
  container,
  textToTranslate,
  sourceLang,
  buttonText
) {
  let translateButton = container.querySelector('.translate-button');

  if (!translateButton) {
    translateButton = document.createElement('span');
    translateButton.className = 'translate-button';
    translateButton.textContent = buttonText;

    // Low-key styling similar to Twitter's translate link
    translateButton.style.marginTop = '8px';
    translateButton.style.marginBottom = '4px';
    translateButton.style.display = 'block';
    translateButton.style.color = '#6699CC'; // Muted blue color
    translateButton.style.fontSize = '0.85rem';
    translateButton.style.fontFamily = 'inherit';
    translateButton.style.cursor = 'pointer';
    translateButton.style.textDecoration = 'none';
    translateButton.style.fontWeight = 'normal';

    // Hover effect
    translateButton.addEventListener('mouseenter', () => {
      translateButton.style.textDecoration = 'underline';
      translateButton.style.color = '#4477AA';
    });

    translateButton.addEventListener('mouseleave', () => {
      translateButton.style.textDecoration = 'none';
      translateButton.style.color = '#6699CC';
    });

    translateButton.addEventListener('click', async () => {
      // Remove any existing error messages before attempting translation
      const existingError = container.querySelector('.translation-error');
      if (existingError) {
        existingError.remove();
      }

      const originalText = translateButton.textContent;
      translateButton.innerHTML = `<svg class="translator-spinner" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg>`;
      translateButton.style.cursor = 'default';

      try {
        // Message background script for translation
        const translatedText = await translateText(
          textToTranslate,
          sourceLang,
          userMainLanguage
        );

        // Create a new element to display the translated text
        const translatedElement = document.createElement('div');
        translatedElement.innerHTML = translatedText;
        translatedElement.className = 'translator-fade-in';
        translatedElement.style.marginTop = '10px';
        translatedElement.style.fontFamily =
          'TiemposTextWeb-Regular,Georgia,serif';
        translatedElement.style.fontSize = '1.15384615rem';
        translatedElement.style.lineHeight = '1.6';
        translatedElement.style.borderLeft = '3px solid #E0E0E0';
        translatedElement.style.paddingLeft = '12px';
        translatedElement.style.marginLeft = '8px';
        translatedElement.style.opacity = '0.95';

        container.appendChild(translatedElement);

        // Hide the translate button after translation
        translateButton.style.display = 'none';
      } catch (error) {
        console.error('Error during translation:', error);
        const errorElement = document.createElement('div');
        errorElement.className = 'translation-error translator-fade-in'; // Add class for easy removal
        errorElement.textContent = `Failed to translate: ${error.message}`;
        errorElement.style.marginTop = '8px';
        errorElement.style.color = '#CC6666';
        errorElement.style.fontSize = '0.85rem';
        container.appendChild(errorElement);

        // Reset button state
        translateButton.innerHTML = originalText;
        translateButton.style.cursor = 'pointer';
        translateButton.style.color = '#6699CC';
      }
    });

    container.appendChild(translateButton);
  }
}

function addTranslateButton(reviewElement, reviewText, sourceLang) {
  let contentContainer;
  if (reviewElement.classList.contains('js-review')) {
    contentContainer = reviewElement;
  } else {
    contentContainer = reviewElement.querySelector('.js-review');
  }

  if (contentContainer) {
    createAndAttachTranslateButton(
      contentContainer,
      reviewText,
      sourceLang,
      'Translate review'
    );
  }
}

function processReviews() {
  // Updated selector to match Letterboxd's current review structure.
  const reviewElements = document.querySelectorAll(
    'article.production-viewing, section.js-review'
  );
  reviewElements.forEach(processReview);
}

function processComments() {
  const commentElements = document.querySelectorAll('li.comment');
  commentElements.forEach(processComment);
}

function processComment(commentElement) {
  const commentBody = commentElement.querySelector('.comment-body');
  if (!commentBody) {
    return;
  }

  // Don't add a button if one is already there.
  if (commentBody.querySelector('.translate-button')) {
    return;
  }

  const { html: commentHtml, text: detectionText } =
    extractCommentContent(commentBody);

  if (!detectionText) {
    return;
  }

  try {
    const response = eld.detect(detectionText);
    const rawDetectedLanguage = response.language || '';
    const detectedLanguage = normalizeLanguage(rawDetectedLanguage, '');
    const scores = response.getScores();
    const confidence = scores[response.language] || scores[detectedLanguage] || 0;
    const isReliable =
      typeof response.isReliable === 'function' ? response.isReliable() : true;

    if (
      detectedLanguage &&
      detectedLanguage !== userMainLanguage &&
      (isReliable || confidence > 0.6)
    ) {
        createAndAttachTranslateButton(
          commentBody,
          commentHtml,
          detectedLanguage,
          'Translate comment'
        );
    }
  } catch (error) {
    console.error('Error processing comment:', error);
  }
}

// Enhanced mutation observer to handle spoiler reveals and new comments
function handleMutations(mutationsList, observer) {
  for (let mutation of mutationsList) {
    if (mutation.type === 'attributes') {
      // Check for hidden attribute changes (spoiler reveals)
      if (
        mutation.attributeName === 'hidden' &&
        mutation.target.classList.contains('js-review-body')
      ) {
        const reviewElement = mutation.target.closest(
          'article.production-viewing'
        );
        if (reviewElement) {
          setTimeout(() => processReview(reviewElement), 100);
        }
      }
    }

    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Handle review expansions
          if (node.classList.contains('body-text')) {
            const reviewElement = node.closest('article.production-viewing');
            if (reviewElement) {
              processReview(reviewElement);
            }
          }

          // Handle new comments
          if (node.matches && node.matches('li.comment')) {
            processComment(node);
          } else if (node.querySelectorAll) {
            const newComments = node.querySelectorAll('li.comment');
            if (newComments.length > 0) {
              newComments.forEach(processComment);
            }
          }
        }
      });
    }
  }
}

// Update the observer to watch for attribute changes too
const observer = new MutationObserver(handleMutations);

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['hidden'], // Watch for changes to the hidden attribute
});

// Updated click handler to handle both "more" links and spoiler reveals
async function processReview(reviewElement) {
  // Check if the review text is hidden due to spoiler protection
  const reviewBody = reviewElement.querySelector('.js-review-body');
  if (reviewBody && reviewBody.hasAttribute('hidden')) {
    return;
  }

  // Check if review body exists and is visible
  if (!reviewBody) {
    return;
  }

  const computedStyle = getComputedStyle(reviewBody);
  if (
    computedStyle.display === 'none' ||
    computedStyle.visibility === 'hidden'
  ) {
    console.log('Review body is not visible, skipping');
    return;
  }

  // Check if the review is collapsed by looking for the "more" link
  const revealLink = reviewElement.querySelector('.body-text a.reveal');
  const isCollapsed =
    revealLink && getComputedStyle(revealLink).display !== 'none';

  if (isCollapsed) {
    return;
  }

  const reviewText = extractReviewText(reviewElement);

  if (!reviewText) {
    return;
  }

  try {
    const response = eld.detect(reviewText);

    if (response.language !== userMainLanguage) {
      if (response.getScores()[response.language] > 0.35) {
        addTranslateButton(reviewElement, reviewText, response.language);
      } else {
        // Language confidence too low, optionally log this for debugging if needed elsewhere
      }
    } else {
      // Review is already in user language, no button needed.
    }
  } catch (error) {
    console.error('Error processing review:', error);
  }
}

// Updated extractReviewText function to handle spoiler reviews better
function extractReviewText(reviewElement) {
  // First try to find the review body (for spoiler reviews)
  let bodyTextNode = reviewElement.querySelector('.js-review-body');

  // If not found, try the regular body-text selector
  if (!bodyTextNode) {
    bodyTextNode = reviewElement.querySelector('.body-text');
  }

  if (!bodyTextNode) {
    return null;
  }

  let sourceNodeForHtml;

  const fullTextNode = bodyTextNode.querySelector('.full-text');
  // If .full-text is present and visible, it's an expanded review
  if (fullTextNode && getComputedStyle(fullTextNode).display !== 'none') {
    sourceNodeForHtml = fullTextNode;
  } else {
    const collapsedTextNode = bodyTextNode.querySelector('.collapsed-text');
    // If .collapsed-text is present and visible (e.g. initial load of a collapsible review)
    if (
      collapsedTextNode &&
      getComputedStyle(collapsedTextNode).display !== 'none'
    ) {
      sourceNodeForHtml = collapsedTextNode;
    } else {
      // Fallback for non-collapsible reviews or spoiler reviews
      sourceNodeForHtml = bodyTextNode;
    }
  }

  // Clone the determined source node to safely modify it
  const clonedNode = sourceNodeForHtml.cloneNode(true);

  // Remove <p class="reveal-text"> which often wraps the " (more)" link
  const revealParagraph = clonedNode.querySelector('p.reveal-text');
  if (revealParagraph) {
    revealParagraph.remove();
  }

  // Remove any <a class="reveal"> link directly from the cloned content
  const revealLinks = clonedNode.querySelectorAll('a.reveal');
  revealLinks.forEach((link) => link.remove());

  const extractedText = clonedNode.innerHTML.trim();

  return extractedText;
}

function extractCommentContent(commentBody) {
  const clonedNode = commentBody.cloneNode(true);

  const removableSelectors = [
    '.translate-button',
    '.translation-error',
    '.translator-fade-in',
  ];

  removableSelectors.forEach((selector) => {
    clonedNode
      .querySelectorAll(selector)
      .forEach((node) => node.parentNode && node.parentNode.removeChild(node));
  });

  const html = clonedNode.innerHTML.trim();
  const text = clonedNode.textContent.replace(/\s+/g, ' ').trim();

  return { html, text };
}

// Enhanced click handler
document.addEventListener('click', function (event) {
  // Handle "more" link clicks (collapsed reviews)
  if (event.target.classList.contains('reveal')) {
    const reviewElement = event.target.closest('article.production-viewing');
    if (reviewElement) {
      setTimeout(() => processReview(reviewElement), 500);
    }
  }

  // Handle spoiler reveal clicks - look for the specific data attribute
  if (
    event.target.hasAttribute('data-js-trigger') &&
    event.target.getAttribute('data-js-trigger') === 'spoiler.reveal'
  ) {
    const reviewElement = event.target.closest('article.production-viewing');
    if (reviewElement) {
      // Try multiple timeouts to catch the reveal
      setTimeout(() => processReview(reviewElement), 100);
      setTimeout(() => processReview(reviewElement), 500);
      setTimeout(() => processReview(reviewElement), 1000);
    }
  }
});
