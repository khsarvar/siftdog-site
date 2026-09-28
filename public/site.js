// Shared script for siftdog.com: copy buttons on code blocks and tabbed code samples.
// Pages work without it; both are enhancements.
const icon = (paths) =>
  `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ` +
  `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const COPY_ICON = icon(
  '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
);
const CHECK_ICON = icon('<path d="M5 12.5l4.5 4.5L19 7.5"/>');

// Copy buttons. Terminal demos (data-no-copy) show output, so they don't get one.
document.querySelectorAll("pre:not([data-no-copy])").forEach((pre) => {
  const wrapper = document.createElement("div");
  wrapper.className = "code-block";
  pre.replaceWith(wrapper);
  wrapper.append(pre);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "copy-button";
  button.innerHTML = COPY_ICON;
  button.title = "Copy";
  button.setAttribute("aria-label", "Copy code to clipboard");
  wrapper.append(button);

  button.addEventListener("click", async () => {
    const text = pre.innerText.replace(/\n$/, "");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers or non-secure pages: select the text and use the legacy copy command.
      const range = document.createRange();
      range.selectNodeContents(pre);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("copy");
      selection.removeAllRanges();
    }
    button.innerHTML = CHECK_ICON;
    button.title = "Copied";
    button.setAttribute("aria-label", "Copied");
    button.classList.add("copied");
    setTimeout(() => {
      button.innerHTML = COPY_ICON;
      button.title = "Copy";
      button.setAttribute("aria-label", "Copy code to clipboard");
      button.classList.remove("copied");
    }, 1500);
  });
});

// Tabs: <div class="tabs"> with .tab-list buttons (role=tab, aria-controls) and .tab-panel panels.
document.querySelectorAll(".tabs").forEach((tabs) => {
  const buttons = [...tabs.querySelectorAll('[role="tab"]')];
  const select = (chosen) => {
    for (const b of buttons) {
      const selected = b === chosen;
      b.setAttribute("aria-selected", String(selected));
      b.tabIndex = selected ? 0 : -1;
      document.getElementById(b.getAttribute("aria-controls")).hidden = !selected;
    }
  };
  buttons.forEach((b, i) => {
    b.addEventListener("click", () => select(b));
    b.addEventListener("keydown", (e) => {
      const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      const next = buttons[(i + step + buttons.length) % buttons.length];
      select(next);
      next.focus();
    });
  });
  tabs.classList.add("js");
  select(buttons.find((b) => b.getAttribute("aria-selected") === "true") ?? buttons[0]);
});
