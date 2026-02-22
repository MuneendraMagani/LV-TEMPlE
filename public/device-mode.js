(function () {

  function detectDeviceMode() {
    const params = new URLSearchParams(window.location.search);
    const manualMode = params.get("mode");

    if (manualMode === "tv" || manualMode === "mobile" || manualMode === "desktop") {
      return manualMode;
    }

    const ua = navigator.userAgent.toLowerCase();
    const isLargeScreen = window.innerWidth >= 1600;
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    const isTV =
      ua.includes("smart-tv") ||
      ua.includes("tizen") ||
      ua.includes("webos") ||
      ua.includes("roku") ||
      (isLargeScreen && !isTouch);

    if (isTV) return "tv";
    if (window.innerWidth <= 768) return "mobile";

    return "desktop";
  }

  function applyMode() {
    document.documentElement.classList.remove("tv-mode", "mobile-mode", "desktop-mode");
    const mode = detectDeviceMode();
    document.documentElement.classList.add(mode + "-mode");
  }

  applyMode();

  window.addEventListener("resize", function () {
    applyMode();
  });

})();
