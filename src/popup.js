document.addEventListener('DOMContentLoaded', initializePopup);
document
  .getElementById('save')
  .addEventListener('click', saveApiKeyAndLanguage);
document.getElementById('removeApiKey').addEventListener('click', removeApiKey);
document
  .getElementById('toggleApiKeyVisibility')
  .addEventListener('click', toggleApiKeyVisibility);

function initializePopup() {
  chrome.storage.local.get(['deeplApiKey', 'targetLang'], (data) => {
    if (data.deeplApiKey) {
      displayCensoredApiKey(data.deeplApiKey);
      document.getElementById('statusMessage').textContent = 'API Key loaded';
    } else {
      document.getElementById('statusMessage').textContent =
        'No API Key stored';
    }
    document.getElementById('targetLang').value = data.targetLang || 'en';
  });
}

function saveApiKeyAndLanguage() {
  console.log(`saving new api key`);
  const apiKeyInput = document.getElementById('apiKey');
  const targetLang = document.getElementById('targetLang').value;

  // Get the full API key from data attribute if it exists (for already loaded keys)
  // Otherwise use the input value (for new keys)
  let apiKey = apiKeyInput.dataset.fullApiKey || apiKeyInput.value;

  // If the input was modified (user typed new key), use the input value
  if (apiKeyInput.value !== apiKeyInput.dataset.censoredValue) {
    apiKey = apiKeyInput.value;
  }

  if (!apiKey || !apiKey.trim()) {
    showStatusMessage('Please enter a valid API Key.');
    return;
  }

  if (confirm(`Save this API Key and language?`)) {
    chrome.storage.local.set(
      { deeplApiKey: apiKey, targetLang: targetLang },
      () => {
        showStatusMessage('API Key and language saved!');
        displayCensoredApiKey(apiKey);
      }
    );
  }
}

function removeApiKey() {
  if (confirm('Are you sure you want to remove the API Key?')) {
    chrome.storage.local.remove('deeplApiKey', () => {
      document.getElementById('statusMessage').textContent = 'API Key removed!';
      const apiKeyInput = document.getElementById('apiKey');
      apiKeyInput.value = '';
      delete apiKeyInput.dataset.fullApiKey;
      delete apiKeyInput.dataset.censoredValue;
    });
  }
}

function toggleApiKeyVisibility() {
  const apiKeyInput = document.getElementById('apiKey');
  const toggleIcon = document.getElementById('toggleApiKeyVisibility');

  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleIcon.src = 'icons/eye_closed_icon.png';
    // Show full API key if it exists
    if (apiKeyInput.dataset.fullApiKey) {
      apiKeyInput.value = apiKeyInput.dataset.fullApiKey;
    }
  } else {
    apiKeyInput.type = 'password';
    toggleIcon.src = 'icons/eye_icon.png';
    // Show censored version if full key exists
    if (apiKeyInput.dataset.fullApiKey) {
      const censoredKey =
        apiKeyInput.dataset.fullApiKey.length < 15
          ? apiKeyInput.dataset.fullApiKey
          : apiKeyInput.dataset.fullApiKey.slice(0, 15) + '...';
      apiKeyInput.value = censoredKey;
    }
  }
}

function displayCensoredApiKey(apiKey) {
  const censoredKey = apiKey.length < 15 ? apiKey : apiKey.slice(0, 15) + '...';
  const apiKeyInput = document.getElementById('apiKey');
  apiKeyInput.value = censoredKey;
  apiKeyInput.dataset.fullApiKey = apiKey;
  apiKeyInput.dataset.censoredValue = censoredKey;
  apiKeyInput.type = 'password';
}

function showStatusMessage(message) {
  const statusMessageElement = document.getElementById('statusMessage');
  statusMessageElement.textContent = message;
  statusMessageElement.style.display = 'block';
  setTimeout(() => {
    statusMessageElement.style.display = 'none';
  }, 2000);
}
