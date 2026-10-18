(() => {
  const box = document.querySelector("textarea") || document.querySelector("[contenteditable=true]");
  if (!box) return "no composer";
  const text = window.__ADO_TEXT__;
  box.focus();
  if (box.tagName === "TEXTAREA") {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(box, text);
    box.dispatchEvent(new Event("input", { bubbles: true }));
  } else { document.execCommand("insertText", false, text); }
  return box.tagName + ":" + (box.value ?? box.textContent).slice(0, 80);
})()
