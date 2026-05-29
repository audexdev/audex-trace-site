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

primaryNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    if (mobileNavQuery.matches) {
      setMenuOpen(false);
    }
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

const trackingParamNames = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const currentParams = new URLSearchParams(window.location.search);
const currentTrackingParams = trackingParamNames
  .map((name) => [name, currentParams.get(name)])
  .filter((entry) => entry[1]);
const currentPagePath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

document.querySelectorAll("a[data-track-download]").forEach((link) => {
  try {
    const url = new URL(link.href);
    currentTrackingParams.forEach(([name, value]) => {
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
  currentTrackingParams.forEach(([name, value]) => {
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
