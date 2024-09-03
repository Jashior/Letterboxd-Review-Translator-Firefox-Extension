// content-loader.js
(async () => {
  try {
    const module = await import(browser.runtime.getURL("src/content.js"));
    if (module.default) {
      module.default();
    }
  } catch (error) {
    console.error("Failed to load module:", error);
  }
})();
