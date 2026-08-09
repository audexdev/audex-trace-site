const header = document.querySelector("[data-elevate]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const primaryNav = document.querySelector("#primary-navigation");
const mobileNavQuery = window.matchMedia("(max-width: 900px)");

const updateHeader = () => {
  header?.classList.toggle("is-elevated", window.scrollY > 8);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const setMenuOpen = (isOpen) => {
  if (!header || !menuToggle || !primaryNav) return;

  header.classList.toggle("is-menu-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");

  if (mobileNavQuery.matches) {
    primaryNav.setAttribute("aria-hidden", String(!isOpen));
  } else {
    primaryNav.removeAttribute("aria-hidden");
  }
};

const syncMenuForViewport = () => {
  if (!header || !menuToggle || !primaryNav) return;

  if (!mobileNavQuery.matches) {
    header.classList.remove("is-menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    primaryNav.removeAttribute("aria-hidden");
    return;
  }

  primaryNav.setAttribute("aria-hidden", String(!header.classList.contains("is-menu-open")));
};

menuToggle?.addEventListener("click", () => {
  setMenuOpen(!header?.classList.contains("is-menu-open"));
});

const currentPageAnchor = (link) => {
  const url = new URL(link.href, window.location.href);

  if (
    url.origin !== window.location.origin
    || url.pathname !== window.location.pathname
    || url.search !== window.location.search
    || !url.hash
  ) {
    return null;
  }

  try {
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    return target ? { hash: url.hash, target } : null;
  } catch {
    return null;
  }
};

const navigateToPageAnchor = ({ hash, target }) => {
  if (window.location.hash === hash) {
    target.scrollIntoView();
    return;
  }

  window.location.hash = hash;
};

primaryNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (!mobileNavQuery.matches) return;

    const anchor = currentPageAnchor(link);
    if (!anchor) {
      setMenuOpen(false);
      return;
    }

    event.preventDefault();

    const finishNavigation = (transitionEvent) => {
      if (transitionEvent.target !== primaryNav || transitionEvent.propertyName !== "max-height") {
        return;
      }

      primaryNav.removeEventListener("transitionend", finishNavigation);
      primaryNav.removeEventListener("transitioncancel", finishNavigation);
      navigateToPageAnchor(anchor);
    };

    primaryNav.addEventListener("transitionend", finishNavigation);
    primaryNav.addEventListener("transitioncancel", finishNavigation);
    setMenuOpen(false);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && header?.classList.contains("is-menu-open")) {
    setMenuOpen(false);
    menuToggle?.focus();
  }
});

syncMenuForViewport();
if (typeof mobileNavQuery.addEventListener === "function") {
  mobileNavQuery.addEventListener("change", syncMenuForViewport);
} else {
  mobileNavQuery.addListener(syncMenuForViewport);
}

const faqItems = Array.from(document.querySelectorAll(".faq-item"));
window.audexTraceFaqReady = faqItems.length > 0;

const setFaqItem = (item, isOpen) => {
  const question = item.querySelector(".faq-question");
  const answer = item.querySelector(".faq-answer");

  if (!question || !answer) return;

  answer.style.setProperty("--faq-answer-height", `${answer.scrollHeight}px`);
  item.classList.toggle("is-open", isOpen);
  question.setAttribute("aria-expanded", String(isOpen));
  answer.setAttribute("aria-hidden", String(!isOpen));
};

const syncFaqHeights = () => {
  faqItems.forEach((item) => {
    const answer = item.querySelector(".faq-answer");
    answer?.style.setProperty("--faq-answer-height", `${answer.scrollHeight}px`);
  });
};

faqItems.forEach((item) => {
  const question = item.querySelector(".faq-question");

  question?.addEventListener("click", () => {
    const shouldOpen = !item.classList.contains("is-open");

    faqItems.forEach((faqItem) => {
      setFaqItem(faqItem, faqItem === item ? shouldOpen : false);
    });
  });
});

syncFaqHeights();
window.addEventListener("resize", syncFaqHeights);

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const tourVideos = Array.from(document.querySelectorAll("video[data-tour-video]"));
const activeTourVideos = new WeakSet();

const syncTourVideo = (video) => {
  video.autoplay = !reducedMotionQuery.matches;

  if (reducedMotionQuery.matches || !activeTourVideos.has(video)) {
    video.pause();
    return;
  }

  const playRequest = video.play();
  playRequest?.catch(() => {});
};

const syncTourVideos = () => tourVideos.forEach(syncTourVideo);

if (tourVideos.length > 0 && "IntersectionObserver" in window) {
  const tourVideoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          activeTourVideos.add(entry.target);
        } else {
          activeTourVideos.delete(entry.target);
        }
        syncTourVideo(entry.target);
      });
    },
    { rootMargin: "120px 0px", threshold: 0.35 }
  );

  tourVideos.forEach((video) => tourVideoObserver.observe(video));
} else {
  tourVideos.forEach((video) => {
    activeTourVideos.add(video);
    syncTourVideo(video);
  });
}

if (typeof reducedMotionQuery.addEventListener === "function") {
  reducedMotionQuery.addEventListener("change", syncTourVideos);
} else {
  reducedMotionQuery.addListener(syncTourVideos);
}

const trackingParamNames = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const storagePrefix = "audexTrace.";
const currentParams = new URLSearchParams(window.location.search);
const currentTrackingParams = trackingParamNames
  .map((name) => [name, currentParams.get(name)])
  .filter((entry) => entry[1]);
const currentPagePath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
const currentRef = currentParams.get("ref");
const currentReferrerHost = referrerHost(document.referrer);
const localTrackingStorage = storage("localStorage");
const sessionTrackingStorage = storage("sessionStorage");
const anonymousId = persistentId("anonymousId", localTrackingStorage);
const sessionId = persistentId("sessionId", sessionTrackingStorage);
const firstTouch = loadFirstTouch();

const commonTrackingParams = [
  ["anonymous_id", anonymousId],
  ["session_id", sessionId],
  ["ref", currentRef || firstTouch.ref],
  ["landing_page", firstTouch.landingPage],
  ["first_ref", firstTouch.ref],
  ["first_referrer_host", firstTouch.referrerHost],
  ...trackingParamNames.map((name) => [name, currentParams.get(name)]),
  ...trackingParamNames.map((name) => [`first_${name}`, firstTouch.utm[name]])
].filter((entry) => entry[1]);

document.querySelectorAll("a[data-track-download]").forEach((link) => {
  try {
    const url = new URL(link.href);
    commonTrackingParams.forEach(([name, value]) => {
      if (!url.searchParams.has(name)) {
        url.searchParams.set(name, value);
      }
    });
    if (!url.searchParams.has("page_path")) {
      url.searchParams.set("page_path", currentPagePath);
    }
    link.href = url.toString();
  } catch {
    // Keep the original link if the browser cannot parse it.
  }
});

document.querySelectorAll("form[data-track-checkout]").forEach((form) => {
  commonTrackingParams.forEach(([name, value]) => {
    setHiddenField(form, name, value);
  });

  if (!form.querySelector('input[name="page_path"]')) {
    setHiddenField(form, "page_path", currentPagePath);
  }
});

function setHiddenField(form, name, value) {
  if (!value) return;

  let input = form.querySelector(`input[name="${name}"]`);
  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    form.appendChild(input);
  }
  input.value = value;
}

function loadFirstTouch() {
  const stored = readJsonStorage(localTrackingStorage, "firstTouch");
  if (stored?.landingPage) {
    return {
      landingPage: stored.landingPage,
      ref: stored.ref || "",
      referrerHost: stored.referrerHost || "",
      utm: stored.utm || {}
    };
  }

  const next = {
    landingPage: currentPagePath,
    ref: currentRef || "",
    referrerHost: currentReferrerHost || "",
    utm: Object.fromEntries(currentTrackingParams)
  };
  writeJsonStorage(localTrackingStorage, "firstTouch", next);
  return next;
}

function persistentId(key, storage) {
  const storageKey = `${storagePrefix}${key}`;
  try {
    const existing = storage.getItem(storageKey);
    if (existing) return existing;
    const value = window.crypto?.randomUUID ? window.crypto.randomUUID() : fallbackRandomId();
    storage.setItem(storageKey, value);
    return value;
  } catch {
    return fallbackRandomId();
  }
}

function storage(name) {
  try {
    const value = window[name];
    value.getItem(`${storagePrefix}storageTest`);
    return value;
  } catch {
    return null;
  }
}

function readJsonStorage(storage, key) {
  if (!storage) return null;
  try {
    const value = storage.getItem(`${storagePrefix}${key}`);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function writeJsonStorage(storage, key, value) {
  if (!storage) return;
  try {
    storage.setItem(`${storagePrefix}${key}`, JSON.stringify(value));
  } catch {
    // Tracking remains best-effort when storage is unavailable.
  }
}

function referrerHost(value) {
  if (!value) return "";
  try {
    return new URL(value).host;
  } catch {
    return "";
  }
}

function fallbackRandomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
