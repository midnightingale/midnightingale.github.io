function isZoomOrHorizontalScroll(e) {
  const { deltaX, ctrlKey } = e;
  if (Math.abs(deltaX) > 0 || ctrlKey) { // ctrlKey is true for zoom events
    return true;
  }
  return false;
}

const container = document.getElementById("gallery");
container.addEventListener("wheel", function(e) {
  if (isZoomOrHorizontalScroll(e)) return;
  e.preventDefault();
  if (Math.abs(e.deltaY) > 0) {
    document.getElementById("gallery").scrollLeft += e.deltaY;
  }
});