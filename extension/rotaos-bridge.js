(() => {
  if (!new URLSearchParams(window.location.search).has("source")) return;
  const MAX_DELIVERY_ATTEMPTS = 40;
  let attempts = 0;
  let accepted = false;
  let timer;

  function deliverWhenReady() {
    if (accepted || attempts >= MAX_DELIVERY_ATTEMPTS) return;
    attempts += 1;
    chrome.storage.local.get("rotaosImportQueue", ({ rotaosImportQueue }) => {
      if (rotaosImportQueue?.orders?.length) {
        window.postMessage(
          { type: "ROTAOS_IMPORT_FROM_PROCESA", payload: rotaosImportQueue },
          window.location.origin,
        );
      }
      if (!accepted) timer = window.setTimeout(deliverWhenReady, 500);
    });
  }

  window.addEventListener("message", (event) => {
    if (event.source === window && event.data?.type === "ROTAOS_IMPORT_ACCEPTED") {
      accepted = true;
      window.clearTimeout(timer);
      chrome.storage.local.remove("rotaosImportQueue");
    }
  });
  deliverWhenReady();
})();
