(() => {
  if (!new URLSearchParams(window.location.search).has("source")) return;
  chrome.storage.local.get("rotaosImportQueue", ({ rotaosImportQueue }) => {
    if (!rotaosImportQueue?.orders?.length) return;
    window.postMessage(
      { type: "ROTAOS_IMPORT_FROM_PROCESA", payload: rotaosImportQueue },
      window.location.origin,
    );
  });
  window.addEventListener("message", (event) => {
    if (event.source === window && event.data?.type === "ROTAOS_IMPORT_ACCEPTED") {
      chrome.storage.local.remove("rotaosImportQueue");
    }
  });
})();
