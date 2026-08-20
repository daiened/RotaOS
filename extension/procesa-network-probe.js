(() => {
  if (window.__rotaosProcesaNetworkProbe) return;
  window.__rotaosProcesaNetworkProbe = true;

  let enabled = false;
  const report = (kind, method, rawUrl, status) => {
    if (!enabled || typeof rawUrl !== "string") return;
    try {
      const url = new URL(rawUrl, window.location.href);
      if (!/operacoes/i.test(url.pathname)) return;
      // Only endpoint, method and status are sent to the bridge. No cookies,
      // request body or response content is read or shared.
      window.postMessage({ type: "ROTAOS_PROCESA_NETWORK", kind, method, url: `${url.pathname}${url.search}`, status }, window.location.origin);
    } catch { /* Ignore malformed URLs. */ }
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.type !== "ROTAOS_PROCESA_START_NETWORK_PROBE") return;
    enabled = true;
    window.postMessage({ type: "ROTAOS_PROCESA_NETWORK_READY" }, window.location.origin);
  });

  const originalFetch = window.fetch;
  window.fetch = async function rotaosObservedFetch(...args) {
    const response = await originalFetch.apply(this, args);
    const requestUrl = args[0] instanceof Request ? args[0].url : String(args[0]);
    report("fetch", String(args[1]?.method || "GET").toUpperCase(), requestUrl, response.status);
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function rotaosObservedOpen(method, url, ...rest) {
    this.__rotaosRequest = { method: String(method || "GET").toUpperCase(), url: String(url) };
    this.addEventListener("loadend", () => report("xhr", this.__rotaosRequest?.method || "GET", this.__rotaosRequest?.url || "", this.status), { once: true });
    return originalOpen.call(this, method, url, ...rest);
  };
})();
