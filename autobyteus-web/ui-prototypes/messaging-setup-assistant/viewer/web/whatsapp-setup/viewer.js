(function () {
  const state = {
    flowMap: null,
    screensById: new Map(),
    transitionsByFrom: new Map(),
    currentScreenId: null,
    history: [],
  };

  const els = {
    mapPath: document.getElementById("mapPath"),
    loadMapButton: document.getElementById("loadMapButton"),
    backButton: document.getElementById("backButton"),
    showHotspots: document.getElementById("showHotspots"),
    status: document.getElementById("status"),
    screenImage: document.getElementById("screenImage"),
    hotspots: document.getElementById("hotspots"),
    flowName: document.getElementById("flowName"),
    flowPlatform: document.getElementById("flowPlatform"),
    currentScreen: document.getElementById("currentScreen"),
    transitionList: document.getElementById("transitionList"),
  };

  function setStatus(message, isError) {
    els.status.textContent = message;
    els.status.classList.toggle("error", Boolean(isError));
  }

  function validateFlowMap(flowMap) {
    if (!flowMap || typeof flowMap !== "object") throw new Error("Flow map must be JSON object.");
    if (!Array.isArray(flowMap.screens) || flowMap.screens.length === 0) throw new Error("Missing screens.");
    if (!Array.isArray(flowMap.transitions)) throw new Error("Missing transitions.");
    if (!flowMap.start_screen) throw new Error("Missing start_screen.");
  }

  function indexFlowMap(flowMap, flowMapUrl) {
    state.screensById.clear();
    state.transitionsByFrom.clear();

    flowMap.screens.forEach((screen) => {
      const imageUrl = new URL(screen.image, flowMapUrl).href;
      state.screensById.set(screen.id, { ...screen, imageUrl });
    });

    flowMap.transitions.forEach((t) => {
      const list = state.transitionsByFrom.get(t.from_screen) || [];
      list.push(t);
      state.transitionsByFrom.set(t.from_screen, list);
    });
  }

  function renderMeta() {
    els.flowName.textContent = state.flowMap.flow_name || "-";
    els.flowPlatform.textContent = state.flowMap.platform || "-";
    els.currentScreen.textContent = state.currentScreenId || "-";
  }

  function renderHotspots(transitions) {
    els.hotspots.innerHTML = "";
    transitions.forEach((t) => {
      if (!t.hotspot) return;
      const box = document.createElement("button");
      box.type = "button";
      box.className = "hotspot";
      box.title = `${t.trigger} -> ${t.to_screen}`;
      box.style.left = `${t.hotspot.x}px`;
      box.style.top = `${t.hotspot.y}px`;
      box.style.width = `${t.hotspot.width}px`;
      box.style.height = `${t.hotspot.height}px`;
      box.hidden = !els.showHotspots.checked;
      box.addEventListener("click", () => navigateTo(t.to_screen, t.trigger));
      els.hotspots.appendChild(box);
    });
  }

  function renderTransitionList(transitions) {
    els.transitionList.innerHTML = "";
    if (transitions.length === 0) {
      els.transitionList.textContent = "No transitions from this screen.";
      return;
    }
    transitions.forEach((t) => {
      const card = document.createElement("div");
      card.className = "transition-card";
      const detail = document.createElement("p");
      detail.innerHTML = `<code>${t.trigger}</code> -> <code>${t.to_screen}</code>`;
      card.appendChild(detail);
      if (!t.hotspot) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Run transition";
        button.addEventListener("click", () => navigateTo(t.to_screen, t.trigger));
        card.appendChild(button);
      }
      els.transitionList.appendChild(card);
    });
  }

  function renderCurrentScreen() {
    const screen = state.screensById.get(state.currentScreenId);
    if (!screen) return;
    const transitions = state.transitionsByFrom.get(state.currentScreenId) || [];
    els.screenImage.src = screen.imageUrl;
    els.screenImage.alt = screen.id;
    renderMeta();
    renderHotspots(transitions);
    renderTransitionList(transitions);
    setStatus(`Loaded screen: ${screen.id}`, false);
  }

  function navigateTo(targetScreenId, triggerName) {
    if (state.currentScreenId) state.history.push(state.currentScreenId);
    state.currentScreenId = targetScreenId;
    renderCurrentScreen();
    setStatus(`Transition: ${triggerName} -> ${targetScreenId}`, false);
  }

  function goBack() {
    const previous = state.history.pop();
    if (!previous) return setStatus("No previous screen in history.", false);
    state.currentScreenId = previous;
    renderCurrentScreen();
  }

  async function loadFlowMap(mapPath) {
    try {
      setStatus("Loading flow map...", false);
      const flowMapUrl = new URL(mapPath, window.location.href);
      const response = await fetch(flowMapUrl.href, { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not load flow map (${response.status}).`);
      const flowMap = await response.json();
      validateFlowMap(flowMap);
      indexFlowMap(flowMap, flowMapUrl.href);
      state.flowMap = flowMap;
      state.history = [];
      state.currentScreenId = flowMap.start_screen;
      renderCurrentScreen();
    } catch (error) {
      setStatus(error.message || String(error), true);
      console.error(error);
    }
  }

  function toggleHotspots() {
    const show = els.showHotspots.checked;
    document.querySelectorAll(".hotspot").forEach((node) => {
      node.hidden = !show;
    });
  }

  els.loadMapButton.addEventListener("click", () => loadFlowMap(els.mapPath.value.trim()));
  els.backButton.addEventListener("click", goBack);
  els.showHotspots.addEventListener("change", toggleHotspots);
  loadFlowMap(els.mapPath.value.trim());
})();
