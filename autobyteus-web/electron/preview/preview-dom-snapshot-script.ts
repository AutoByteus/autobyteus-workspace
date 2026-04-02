export type PreviewDomSnapshotBoundingBox = {
  x: number
  y: number
  width: number
  height: number
}

export type PreviewDomSnapshotElement = {
  element_id: string
  tag_name: string
  dom_id: string | null
  css_selector: string
  role: string | null
  name: string | null
  text: string | null
  href: string | null
  value: string | null
  bounding_box: PreviewDomSnapshotBoundingBox | null
}

export type PreviewDomSnapshotScriptResult = {
  schema_version: "autobyteus-preview-dom-snapshot-v1"
  total_candidates: number
  returned_elements: number
  truncated: boolean
  elements: PreviewDomSnapshotElement[]
}

export const PREVIEW_DOM_SNAPSHOT_SCRIPT = `(({ includeNonInteractive, includeBoundingBoxes, maxElements }) => {
  const normalize = (value) => String(value || "").replace(/\\s+/g, " ").trim();
  const cssEscape = (value) => {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\\\$&");
  };
  const isVisible = (el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }
    if (Number(style.opacity || 1) === 0) {
      return false;
    }
    return true;
  };
  const buildSelector = (el) => {
    if (el.id) {
      return "#" + cssEscape(el.id);
    }
    const parts = [];
    let node = el;
    let depth = 0;
    while (node && node.nodeType === Node.ELEMENT_NODE && depth < 6) {
      const tagName = node.tagName.toLowerCase();
      let part = tagName;
      if (node.classList && node.classList.length > 0) {
        const classes = Array.from(node.classList).slice(0, 2).map(cssEscape);
        if (classes.length > 0) {
          part += "." + classes.join(".");
        }
      }
      let nth = 1;
      let sibling = node.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === node.tagName) {
          nth += 1;
        }
        sibling = sibling.previousElementSibling;
      }
      part += ":nth-of-type(" + nth + ")";
      parts.unshift(part);
      if (node.parentElement && node.parentElement.id) {
        parts.unshift("#" + cssEscape(node.parentElement.id));
        break;
      }
      node = node.parentElement;
      depth += 1;
    }
    return parts.join(" > ");
  };
  const interactiveSelector = [
    "a[href]",
    "button",
    "input",
    "select",
    "textarea",
    "summary",
    "[role='button']",
    "[role='link']",
    "[role='checkbox']",
    "[role='radio']",
    "[role='tab']",
    "[onclick]",
    "[contenteditable='']",
    "[contenteditable='true']",
    "[tabindex]"
  ].join(",");
  const selector = includeNonInteractive ? "*" : interactiveSelector;
  const candidates = Array.from(document.querySelectorAll(selector));
  const elements = [];
  const seenSelectors = new Set();
  for (const el of candidates) {
    if (elements.length >= maxElements) {
      break;
    }
    if (!isVisible(el)) {
      continue;
    }
    const cssSelector = buildSelector(el);
    if (!cssSelector || seenSelectors.has(cssSelector)) {
      continue;
    }
    seenSelectors.add(cssSelector);
    const rect = el.getBoundingClientRect();
    const text = normalize(el.innerText || el.textContent).slice(0, 240) || null;
    const name = normalize(
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      el.getAttribute("placeholder") ||
      el.getAttribute("alt")
    ) || null;
    const href = el.getAttribute("href");
    const value =
      "value" in el && typeof el.value === "string"
        ? normalize(el.value).slice(0, 240) || null
        : null;
    elements.push({
      element_id: "e" + (elements.length + 1),
      tag_name: el.tagName.toLowerCase(),
      dom_id: el.id || null,
      css_selector: cssSelector,
      role: el.getAttribute("role"),
      name,
      text,
      href: href ? String(href) : null,
      value,
      bounding_box: includeBoundingBoxes
        ? {
            x: Number(rect.x),
            y: Number(rect.y),
            width: Number(rect.width),
            height: Number(rect.height)
          }
        : null
    });
  }
  return {
    schema_version: "autobyteus-preview-dom-snapshot-v1",
    total_candidates: candidates.length,
    returned_elements: elements.length,
    truncated: candidates.length > elements.length,
    elements
  };
})`
