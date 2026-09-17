document.addEventListener("DOMContentLoaded", () => {
  /* ---- Reveal-on-load animation for hero elements ---- */
  const revealEls = document.querySelectorAll(".reveal");
  requestAnimationFrame(() => {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  });

  /* ---- Scroll-triggered reveals (About section) ---- */
  const scrollRevealEls = document.querySelectorAll(
    ".reveal-onscroll, .skill-card, .project-card"
  );

  if ("IntersectionObserver" in window && scrollRevealEls.length) {
    const scrollObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25, rootMargin: "0px 0px -60px 0px" }
    );

    scrollRevealEls.forEach((el) => scrollObserver.observe(el));
  } else {
    scrollRevealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---- Tilt effect for About cards ---- */
  const tiltCards = document.querySelectorAll(".tilt-card");
  const MAX_TILT = 8;

  tiltCards.forEach((card) => {
    const resetTilt = () => {
      card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
      card.style.setProperty("--mx", "50%");
      card.style.setProperty("--my", "50%");
    };

    card.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;

      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;

      const rotateY = (px - 0.5) * MAX_TILT * 2;
      const rotateX = (0.5 - py) * MAX_TILT * 2;

      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      card.style.setProperty("--mx", `${px * 100}%`);
      card.style.setProperty("--my", `${py * 100}%`);
    });

    card.addEventListener("pointerleave", resetTilt);
  });

  /* ---- Pinned scroll-steps for Experience section ----
     .experience__scroller has a plain, fixed CSS height (see style.css) —
     nothing here measures or mutates it. That height is the single source
     of truth for both the CSS position:sticky pin and the progress math
     below, so the two can never disagree with each other. */
  const experienceScroller = document.querySelector(".experience__scroller");
  const experienceSteps = document.querySelectorAll(".experience__steps .step");
  const PIN_ENABLED_QUERY = "(min-width: 961px)";
  let experienceTicking = false;

  const updateExperienceSteps = () => {
    experienceTicking = false;
    if (!experienceScroller || !experienceSteps.length) return;

    if (!window.matchMedia(PIN_ENABLED_QUERY).matches) {
      // On mobile the pin/scroll-jack is disabled — steps get a tap
      // highlight (CSS :active) instead, so clear any leftover scroll-driven
      // highlight rather than leaving one step stuck active.
      experienceSteps.forEach((step) => step.classList.remove("active"));
      return;
    }

    const rect = experienceScroller.getBoundingClientRect();
    const scrollableRange = rect.height - window.innerHeight;
    if (scrollableRange <= 0) return;

    const progress = Math.min(Math.max(-rect.top / scrollableRange, 0), 1);
    const activeIndex = Math.min(
      experienceSteps.length - 1,
      Math.floor(progress * experienceSteps.length)
    );

    experienceSteps.forEach((step, i) => {
      step.classList.toggle("active", i === activeIndex);
    });
  };

  const requestExperienceUpdate = () => {
    if (!experienceTicking) {
      experienceTicking = true;
      requestAnimationFrame(updateExperienceSteps);
    }
  };

  if (experienceScroller && experienceSteps.length) {
    window.addEventListener("scroll", requestExperienceUpdate, { passive: true });
    window.addEventListener("resize", requestExperienceUpdate);
    updateExperienceSteps();
  }

  /* ---- Tap-to-highlight steps on mobile (no pin-scroll there) ---- */
  experienceSteps.forEach((step) => {
    step.addEventListener("click", () => {
      if (window.matchMedia(PIN_ENABLED_QUERY).matches) return;

      const wasActive = step.classList.contains("active");
      experienceSteps.forEach((s) => s.classList.remove("active"));
      if (!wasActive) step.classList.add("active");
    });
  });

  /* ---- Contact form validation ---- */
  const contactForm = document.getElementById("contactForm");
  const contactStatus = document.getElementById("contactStatus");

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const setFieldError = (field, message) => {
    const wrapper = field.closest(".form-field");
    const errorEl = wrapper?.querySelector(`[data-error-for="${field.name}"]`);
    if (message) {
      wrapper?.classList.add("has-error");
      if (errorEl) errorEl.textContent = message;
    } else {
      wrapper?.classList.remove("has-error");
      if (errorEl) errorEl.textContent = "";
    }
  };

  const FORMSPREE_ENDPOINT = "https://formspree.io/f/moevaonw";

  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nameField = contactForm.elements.name;
      const emailField = contactForm.elements.email;
      const messageField = contactForm.elements.message;

      let isValid = true;

      if (!nameField.value.trim()) {
        setFieldError(nameField, "Please enter your name.");
        isValid = false;
      } else {
        setFieldError(nameField, "");
      }

      if (!emailField.value.trim()) {
        setFieldError(emailField, "Please enter your email.");
        isValid = false;
      } else if (!EMAIL_RE.test(emailField.value.trim())) {
        setFieldError(emailField, "Please enter a valid email address.");
        isValid = false;
      } else {
        setFieldError(emailField, "");
      }

      if (!messageField.value.trim()) {
        setFieldError(messageField, "Please add a short message.");
        isValid = false;
      } else {
        setFieldError(messageField, "");
      }

      if (!isValid) {
        if (contactStatus) {
          contactStatus.textContent = "Please fix the highlighted fields.";
          contactStatus.className = "contact-form__status error";
        }
        return;
      }

      const submitBtn = contactForm.querySelector(".contact-form__submit");
      const submitBtnDefaultText = submitBtn?.innerHTML;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";
      }
      if (contactStatus) {
        contactStatus.textContent = "";
        contactStatus.className = "contact-form__status";
      }

      try {
        const response = await fetch(FORMSPREE_ENDPOINT, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: new FormData(contactForm),
        });

        if (response.ok) {
          if (contactStatus) {
            contactStatus.textContent =
              "Thanks! Your message has been sent — I'll get back to you soon.";
            contactStatus.className = "contact-form__status success";
          }
          contactForm.reset();
        } else {
          throw new Error("Form submission failed");
        }
      } catch (error) {
        if (contactStatus) {
          contactStatus.textContent =
            "Something went wrong sending your message. Please try again or email me directly.";
          contactStatus.className = "contact-form__status error";
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = submitBtnDefaultText;
        }
      }
    });

    contactForm.querySelectorAll("input, textarea").forEach((field) => {
      field.addEventListener("input", () => setFieldError(field, ""));
    });
  }

  /* ---- Hide broken project screenshots gracefully ---- */
  document.querySelectorAll(".project-card__shot").forEach((img) => {
    img.addEventListener("error", () => {
      img.style.display = "none";
    });
  });

  /* ---- Mobile menu toggle ---- */
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.querySelector(".nav-links");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      menuToggle.classList.toggle("open");
      navLinks.classList.toggle("nav-links--open");
    });
  }

  /* ---- Close mobile menu after clicking a link ---- */
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle?.classList.remove("open");
      navLinks?.classList.remove("nav-links--open");
    });
  });

  /* ---- Highlight active nav link on scroll ---- */
  const sections = document.querySelectorAll("main section[id]");
  const navItems = document.querySelectorAll(".nav-link");

  const onScroll = () => {
    let current = "";
    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 120;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute("id");
      }
    });

    navItems.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${current}`);
    });
  };

  window.addEventListener("scroll", onScroll);
  onScroll();
});
