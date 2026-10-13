// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Mobile menu toggle
const toggle = document.querySelector(".nav-toggle");
const menu = document.getElementById("nav-menu");

toggle.addEventListener("click", () => {
  const isOpen = menu.classList.toggle("open");
  toggle.setAttribute("aria-expanded", isOpen);
  toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});

// Close the mobile menu after tapping a link
menu.querySelectorAll("a").forEach((link) =>
  link.addEventListener("click", () => {
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
  })
);

// Submit the contact form without leaving the page (works with Formspree)
const form = document.querySelector(".contact-form");
const status = form?.querySelector(".form-status");

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = form.querySelector("button");
  button.disabled = true;
  status.className = "form-status";
  status.textContent = "Sending…";

  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    });

    if (!response.ok) throw new Error();
    form.reset();
    status.className = "form-status success";
    status.textContent = "Thanks! Your message has been sent.";
  } catch {
    status.className = "form-status error";
    status.textContent = "Something went wrong. Please reach out on LinkedIn instead.";
  } finally {
    button.disabled = false;
  }
});
