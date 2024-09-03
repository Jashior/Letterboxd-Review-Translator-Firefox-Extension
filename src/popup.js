document.addEventListener("DOMContentLoaded", initializePopup);
document
  .getElementById("save")
  .addEventListener("click", saveApiKeyAndLanguage);
document.getElementById("removeApiKey").addEventListener("click", removeApiKey);
document
  .getElementById("toggleApiKeyVisibility")
  .addEventListener("click", toggleApiKeyVisibility);

function initializePopup() {
  chrome.storage.local.get(["deeplApiKey", "targetLang"], (data) => {
    if (data.deeplApiKey) {
      displayCensoredApiKey(data.deeplApiKey);
      document.getElementById("statusMessage").textContent = "API Key loaded";
    } else {
      document.getElementById("statusMessage").textContent =
        "No API Key stored";
    }

    document.getElementById("targetLang").value = data.targetLang || "en";
  });
}

function saveApiKeyAndLanguage() {
  console.log(`saving new api key`);
  const apiKey = document.getElementById("apiKey").value;
  const targetLang = document.getElementById("targetLang").value;

  if (!apiKey.trim()) {
    showStatusMessage("Please enter a valid API Key.");
    return;
  }

  if (confirm(`Save this API Key and language?`)) {
    chrome.storage.local.set(
      { deeplApiKey: apiKey, targetLang: targetLang },
      () => {
        showStatusMessage("API Key and language saved!");
        displayCensoredApiKey(apiKey);
      }
    );
  }
}

function removeApiKey() {
  if (confirm("Are you sure you want to remove the API Key?")) {
    chrome.storage.local.remove("deeplApiKey", () => {
      document.getElementById("statusMessage").textContent = "API Key removed!";
      document.getElementById("apiKey").value = "";
    });
  }
}

function toggleApiKeyVisibility() {
  const apiKeyInput = document.getElementById("apiKey");
  const toggleIcon = document.getElementById("toggleApiKeyVisibility");

  if (apiKeyInput.type === "password") {
    apiKeyInput.type = "text";
    toggleIcon.src = "icons/eye_closed_icon.png";
  } else {
    apiKeyInput.type = "password";
    toggleIcon.src = "icons/eye_icon.png";
  }
}

function displayCensoredApiKey(apiKey) {
  const censoredKey = apiKey.length < 15 ? apiKey : apiKey.slice(0, 15) + "...";
  document.getElementById("apiKey").value = censoredKey;
  document.getElementById("apiKey").dataset.fullApiKey = apiKey;
}

function showStatusMessage(message) {
  const statusMessageElement = document.getElementById("statusMessage");
  statusMessageElement.textContent = message;
  statusMessageElement.style.display = "block";
  setTimeout(() => {
    statusMessageElement.style.display = "none";
  }, 2000);
}
