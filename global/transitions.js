const transitionDuration = 700;
let navigationStarted = false;

const overlay = document.querySelector(".page-transition-overlay");

function revealPage() {
  navigationStarted = false;
  document.documentElement.classList.remove("page-transition-out");
  document.documentElement.removeAttribute("aria-busy");

  // Let the opaque entrance state reach the screen before fading it away.
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      document.documentElement.classList.remove("page-transition-entering");
    });
  });
}

document.addEventListener("click", function(event) {
  if (
    navigationStarted ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) return;

  const link = event.target.closest("a[href]");
  if (!link || link.hasAttribute("download")) return;
  if (link.target && link.target !== "_self") return;
  if (link.dataset.noPageTransition !== undefined) return;

  const destination = new URL(link.href, window.location.href);
  if (destination.origin !== window.location.origin) return;
  if (!/^https?:$/.test(destination.protocol)) return;

  const current = new URL(window.location.href);
  const isSamePageHash =
    destination.pathname === current.pathname &&
    destination.search === current.search &&
    destination.hash !== current.hash;
  if (isSamePageHash || destination.href === current.href) return;

  event.preventDefault();
  navigationStarted = true;
  document.documentElement.classList.add("page-transition-out");
  document.documentElement.setAttribute("aria-busy", "true");

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.location.assign(destination.href);
    return;
  }

  let navigationCommitted = false;
  function navigate() {
    if (navigationCommitted) return;
    navigationCommitted = true;
    window.location.assign(destination.href);
  }

  overlay.addEventListener("transitionend", navigate, { once: true });
  window.setTimeout(navigate, transitionDuration + 100);
});

window.addEventListener("pageshow", function(event) {
  if (event.persisted) {
    document.documentElement.classList.add("page-transition-entering");
  }
  revealPage();
});
