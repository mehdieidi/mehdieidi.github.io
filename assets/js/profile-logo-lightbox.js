document.addEventListener("DOMContentLoaded", () => {
  const lightbox = document.querySelector(".profile-logo-lightbox");
  const lightboxImage = lightbox?.querySelector(".profile-logo-lightbox__image");
  const caption = lightbox?.querySelector(".profile-logo-lightbox__caption");
  const closeButton = lightbox?.querySelector(".profile-logo-lightbox__close");

  if (!lightbox || !lightboxImage || !caption || !closeButton) return;

  document.querySelectorAll(".profile-logo-button").forEach((button) => {
    button.addEventListener("click", () => {
      const logo = button.querySelector(".profile-logo");
      if (!logo) return;

      lightboxImage.src = logo.currentSrc || logo.src;
      lightboxImage.alt = logo.alt;
      caption.textContent = logo.alt;
      lightbox.showModal();
    });
  });

  closeButton.addEventListener("click", () => lightbox.close());

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
});
