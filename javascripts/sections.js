(() => {
  const disclosures = [...document.querySelectorAll("details.section-disclosure")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const panels = new Map(disclosures.map((details) => {
    const summary = details.querySelector("summary");
    const content = details.querySelector(".section-content");
    let expanded = details.open;
    let animation;

    function setOpen(open, { animate = true } = {}) {
      if (animate && expanded === open && details.open === open) return;
      const startHeight = details.open ? content.getBoundingClientRect().height : 0;
      const startPadding = details.open ? getComputedStyle(content).paddingBottom : "0px";
      if (animation) {
        animation.onfinish = null;
        animation.cancel();
        animation = undefined;
      }
      expanded = open;
      details.classList.remove("is-animating");
      details.removeAttribute("data-closing");
      if (!animate || reducedMotion.matches || !content.animate) {
        details.open = open;
        return;
      }

      details.open = true;
      const endHeight = open ? content.getBoundingClientRect().height : 0;
      const endPadding = open ? getComputedStyle(content).paddingBottom : "0px";
      details.toggleAttribute("data-closing", !open);
      details.classList.add("is-animating");
      animation = content.animate([
        { height: `${startHeight}px`, paddingBottom: startPadding },
        { height: `${endHeight}px`, paddingBottom: endPadding }
      ], { duration: 280, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "both" });
      animation.onfinish = () => {
        details.open = expanded;
        details.classList.remove("is-animating");
        details.removeAttribute("data-closing");
        animation.cancel();
        animation = undefined;
      };
    }

    summary.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      event.preventDefault();
      setOpen(!expanded);
    });
    details.addEventListener("toggle", () => {
      if (!animation) expanded = details.open;
    });
    return [details, { setOpen, get open() { return expanded; },
      finish() { if (animation) setOpen(expanded, { animate: false }); } }];
  }));

  function revealTarget(hash, { scroll = false, focus = false, animate = true } = {}) {
    if (!hash || hash === "#") return false;
    let target;
    try {
      target = document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return false;
    }
    if (!target) return false;
    const disclosure = target.closest("details.section-disclosure") ||
      target.querySelector("details.section-disclosure");
    if (disclosure) panels.get(disclosure).setOpen(true, { animate });
    if (focus && disclosure) {
      disclosure.querySelector("summary").focus({ preventScroll: true });
    }
    if (scroll) requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
    return true;
  }

  document.querySelector('nav[aria-label="Sections"]').addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link || !revealTarget(link.hash, { scroll: true, focus: true })) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, "", link.hash);
  });

  revealTarget(location.hash, { scroll: true, animate: false });
  window.addEventListener("hashchange", () => revealTarget(location.hash, { scroll: true }));
  window.addEventListener("resize", () => panels.forEach((panel) => panel.finish()));
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) panels.forEach((panel) => panel.finish());
  });

  let printState;
  window.addEventListener("beforeprint", () => {
    if (printState) return;
    printState = disclosures.map((section) => panels.get(section).open);
    panels.forEach((panel) => panel.setOpen(true, { animate: false }));
  });
  window.addEventListener("afterprint", () => {
    if (!printState) return;
    disclosures.forEach((section, index) => {
      panels.get(section).setOpen(printState[index], { animate: false });
    });
    printState = undefined;
  });
})();
