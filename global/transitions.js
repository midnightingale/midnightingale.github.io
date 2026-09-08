(() => {
  document.documentElement.classList.add("images-loading");

  addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("img").forEach((image) => {
      const reveal = () => image.classList.add("image-loaded");

      if (image.complete) reveal();
      else {
        image.addEventListener("load", reveal, { once: true });
        image.addEventListener("error", reveal, { once: true });
      }
    });
  });

  let isLeaving = false;

  document.addEventListener("click", (event) => {
    if (
      isLeaving ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    const link = event.target.closest("a[href]");
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;

    const destination = new URL(link.href, location.href);
    const current = new URL(location.href);
    if (
      destination.origin !== location.origin ||
      !["http:", "https:"].includes(destination.protocol) ||
      destination.href === current.href ||
      (destination.pathname === location.pathname &&
        destination.search === location.search &&
        destination.hash)
    ) return;

    event.preventDefault();
    isLeaving = true;

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      location.assign(destination.href);
      return;
    }

    let navigationFinished = false;
    const finishNavigation = () => {
      if (navigationFinished) return;
      navigationFinished = true;
      location.assign(destination.href);
    };
    const onAnimationEnd = (animationEvent) => {
      if (animationEvent.animationName !== "page-cover-out") return;
      document.removeEventListener("animationend", onAnimationEnd);
      finishNavigation();
    };

    document.addEventListener("animationend", onAnimationEnd);
    document.documentElement.classList.add("page-is-leaving");
    setTimeout(finishNavigation, 700);
  });

  addEventListener("pageshow", () => {
    isLeaving = false;
    document.documentElement.classList.remove("page-is-leaving");
  });
})();
