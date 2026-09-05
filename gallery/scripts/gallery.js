function isZoomOrHorizontalScroll(e) {
  const { deltaX, ctrlKey } = e;
  if (Math.abs(deltaX) > 0 || ctrlKey) { // ctrlKey is true for zoom events
    return true;
  }
  return false;
}

const container = document.getElementById("gallery");
if (container) {
  container.addEventListener("wheel", function(e) {
    if (isZoomOrHorizontalScroll(e)) return;
    e.preventDefault();
    if (Math.abs(e.deltaY) > 0) {
      container.scrollLeft += e.deltaY;
    }
  });
}

// Move toward a selected doorway while the page fades away.
if (container && container.classList.contains("main-hall")) {
  container.addEventListener("click", function(e) {
    const door = e.target.closest(".gallery-door");
    if (
      !door ||
      door.classList.contains("is-coming-soon") ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return;

    const bounds = door.getBoundingClientRect();
    const doorCentreX = bounds.left + bounds.width / 2;
    const doorCentreY = bounds.top + bounds.height * 0.35;

    container.style.setProperty("--hall-enter-origin-x", `${doorCentreX}px`);
    container.style.setProperty("--hall-enter-origin-y", `${doorCentreY}px`);
    container.style.setProperty("--hall-enter-x", `${window.innerWidth / 2 - doorCentreX}px`);
    container.style.setProperty("--hall-enter-y", `${window.innerHeight * 0.35 - doorCentreY}px`);
    container.classList.add("is-entering");
  });
}

// opens museum labels by cloning them (for no layout shift)
const cardDialog = document.createElement("dialog");
cardDialog.className = "museum-label-dialog";
document.body.appendChild(cardDialog);

// Return on the page activates the hall's visible Enter anchor.
document.addEventListener("keydown", function(event) {
  if (event.key === "Enter" && event.target === document.body) {
    document.querySelector("a.enter-text[href^='#']")?.click();
  }
});

let zoomedLabel = null;

function openMuseumLabel(label) {
  const from = label.getBoundingClientRect();
  const layoutScale = Math.max(1, Math.min(6, (window.innerWidth - 48) / from.width));
  zoomedLabel = label.cloneNode(true);
  zoomedLabel.style.zoom = layoutScale;

  cardDialog.classList.add("is-positioning");
  cardDialog.appendChild(zoomedLabel);
  cardDialog.showModal();
  document.documentElement.classList.add("museum-label-open");

  const to = zoomedLabel.getBoundingClientRect();
  // `zoom` scales transform translations too, so convert viewport offsets back
  // into the enlarged label's local coordinate space.
  const x = (from.left + from.width / 2 - (to.left + to.width / 2)) / layoutScale;
  const y = (from.top + from.height / 2 - (to.top + to.height / 2)) / layoutScale;

  cardDialog.style.cssText = `
    --museum-label-origin-x: ${x}px;
    --museum-label-origin-y: ${y}px;
    --museum-label-closed-scale: ${1 / layoutScale};
  `;

  // Commit the starting transform before transitioning the clone to the centre.
  void zoomedLabel.offsetWidth;
  cardDialog.classList.remove("is-positioning");
  cardDialog.classList.add("is-open");
}

function closeMuseumLabel() {
  if (!zoomedLabel) return;

  const label = zoomedLabel;
  let closingFinished = false;
  let closingFallback;
  cardDialog.classList.remove("is-open");

  function finishClosing() {
    if (closingFinished) return;
    closingFinished = true;
    window.clearTimeout(closingFallback);
    if (cardDialog.open) cardDialog.close();
    cardDialog.replaceChildren();
    document.documentElement.classList.remove("museum-label-open");
    cardDialog.classList.remove("is-positioning");
    cardDialog.removeAttribute("style");
    zoomedLabel = null;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finishClosing();
    return;
  }

  label.addEventListener("transitionend", finishClosing, { once: true });
  label.addEventListener("transitioncancel", finishClosing, { once: true });
  closingFallback = window.setTimeout(finishClosing, 350);
}

document.addEventListener("click", function(event) {
  const card = event.target.closest(".museum-label");

  if (card && !zoomedLabel) {
    openMuseumLabel(card);
    return;
  }

  if (event.target === cardDialog || (card && cardDialog.contains(card))) {
    closeMuseumLabel();
  }
});

cardDialog.addEventListener("cancel", function(event) {
  event.preventDefault();
  closeMuseumLabel();
});
