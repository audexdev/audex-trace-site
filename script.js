const header = document.querySelector("[data-elevate]");

const updateHeader = () => {
  header?.classList.toggle("is-elevated", window.scrollY > 8);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });
