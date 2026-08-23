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

// sometimes people click the arrow in the intro text
// this scrolls them into the hall when that happens
function scrollIntoGallery()
{
  const target = document.getElementsByClassName('artwork')[0];
  if (!target) return;
  target.scrollIntoView({
    behavior: 'smooth',
    block: 'start' // aligns to the top of the view
  });
}

// opens museum labels by cloning them (for no layout shift)
const cardDialog = document.createElement("dialog");
cardDialog.className = "museum-label-dialog";
document.body.appendChild(cardDialog);

let zoomedLabel = null;

function openMuseumLabel(label) {
  const from = label.getBoundingClientRect();
  zoomedLabel = label.cloneNode(true);

  cardDialog.classList.add("is-positioning");
  cardDialog.appendChild(zoomedLabel);
  cardDialog.showModal();
  document.documentElement.classList.add("museum-label-open");

  const to = zoomedLabel.getBoundingClientRect();
  const x = from.left + from.width / 2 - (to.left + to.width / 2);
  const y = from.top + from.height / 2 - (to.top + to.height / 2);
  const scale = Math.max(1, Math.min(6, (window.innerWidth - 48) / from.width));

  cardDialog.style.cssText = `
    --museum-label-origin-x: ${x}px;
    --museum-label-origin-y: ${y}px;
    --museum-label-open-scale: ${scale};
  `;

  // Commit the starting transform before transitioning the clone to the centre.
  void zoomedLabel.offsetWidth;
  cardDialog.classList.remove("is-positioning");
  cardDialog.classList.add("is-open");
}

function closeMuseumLabel() {
  if (!zoomedLabel) return;

  const label = zoomedLabel;
  cardDialog.classList.remove("is-open");

  function finishClosing() {
    cardDialog.close();
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
