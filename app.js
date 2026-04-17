const events = Array.isArray(window.TOP_SLOP_EVENTS) ? window.TOP_SLOP_EVENTS : [];
const mediaLibrary = window.TOP_SLOP_MEDIA || {};
let activeLightbox = null;

if (document.body.dataset.page === "list") {
  ensureLightbox();
  renderTimeline();
}

function renderTimeline() {
  const container = document.querySelector("[data-timeline]");

  if (!container) {
    return;
  }

  const sortedEvents = [...events].sort((left, right) =>
    left.breakoutDate.localeCompare(right.breakoutDate),
  );

  let currentYear = "";

  for (const event of sortedEvents) {
    const year = event.breakoutDate.slice(0, 4);

    if (year !== currentYear) {
      currentYear = year;
      const yearHeading = document.createElement("h2");
      yearHeading.className = "timeline-year";
      yearHeading.textContent = year;
      container.append(yearHeading);
    }

    const details = document.createElement("details");
    details.className = "timeline-entry";
    details.dataset.slug = event.slug;

    const summary = document.createElement("summary");
    summary.innerHTML = `
      <p class="entry-date">${formatDate(event.breakoutDate)}</p>
      <h3 class="entry-title">${event.entry}</h3>
    `;

    const panel = document.createElement("div");
    panel.className = "entry-panel";
    panel.innerHTML = `
      <section class="media-shell" data-media-shell>
        <div class="media-stage">
          <div class="media-empty">Loading media...</div>
        </div>
      </section>

      <section class="entry-copy">
        <p class="entry-note">${event.bookmarkNote}</p>
        <div class="entry-meta">
          <div class="meta-block">
            <span class="meta-label">First Seen</span>
            <p class="meta-value">${formatDate(event.firstSeenDate)}</p>
          </div>
          <div class="meta-block">
            <span class="meta-label">Aesthetic Mode</span>
            <p class="meta-value">${event.aestheticMode}</p>
          </div>
          <div class="meta-block">
            <span class="meta-label">Pattern Tags</span>
            <div class="tag-list">${event.patternTags.map((tag) => `<span class="tag">${humanizeTag(tag)}</span>`).join("")}</div>
          </div>
        </div>
      </section>
    `;

    details.append(summary, panel);
    details.addEventListener("toggle", () => {
      if (details.open && !details.dataset.mediaLoaded) {
        details.dataset.mediaLoaded = "true";
        hydrateMedia(details, event);
      }
    });

    container.append(details);
  }

  openRequestedEntry(container);
}

function openRequestedEntry(container) {
  const params = new URLSearchParams(window.location.search);
  const requestedSlug = params.get("open") || window.location.hash.replace(/^#/, "");

  if (!requestedSlug) {
    return;
  }

  const requestedEntry = container.querySelector(`[data-slug="${CSS.escape(requestedSlug)}"]`);

  if (!requestedEntry) {
    return;
  }

  requestedEntry.open = true;

  if (!requestedEntry.dataset.mediaLoaded) {
    requestedEntry.dataset.mediaLoaded = "true";

    const event = events.find((item) => item.slug === requestedSlug);

    if (event) {
      hydrateMedia(requestedEntry, event);
    }
  }
}

function hydrateMedia(details, event) {
  const shell = details.querySelector("[data-media-shell]");

  if (!shell) {
    return;
  }

  const manifest = mediaLibrary[event.slug];
  const items = Array.isArray(manifest?.items) ? manifest.items : [];

  if (items.length === 0) {
    shell.innerHTML = '<div class="media-stage"><div class="media-empty">No media available.</div></div>';
    return;
  }

  renderCarousel(shell, items, `./media/${event.slug}/`);
}

function renderCarousel(shell, items, basePath) {
  shell.innerHTML = `
    <div class="media-stage" data-media-stage>
      <button class="media-arrow media-arrow--prev" type="button" data-media-prev aria-label="Previous image">
        <span aria-hidden="true">‹</span>
      </button>
      <button class="media-arrow media-arrow--next" type="button" data-media-next aria-label="Next image">
        <span aria-hidden="true">›</span>
      </button>
    </div>
    <div class="media-dots" data-media-dots aria-label="Carousel pagination"></div>
  `;

  const stage = shell.querySelector("[data-media-stage]");
  const dotContainer = shell.querySelector("[data-media-dots]");
  const prevButton = shell.querySelector("[data-media-prev]");
  const nextButton = shell.querySelector("[data-media-next]");
  const slides = [];
  const dots = [];
  let activeIndex = 0;

  items.forEach((item, index) => {
    const slide = document.createElement("div");
    slide.className = "media-slide";
    slide.hidden = index !== activeIndex;
    slide.append(createMediaNode(item, basePath));
    stage.append(slide);
    slides.push(slide);

    const dot = document.createElement("button");
    dot.className = "media-dot";
    dot.type = "button";
    dot.ariaLabel = `Slide ${index + 1}`;
    dot.setAttribute("aria-current", index === activeIndex ? "true" : "false");
    dot.addEventListener("click", () => {
      activeIndex = index;
      syncCarousel();
    });
    dotContainer.append(dot);
    dots.push(dot);
  });

  function syncCarousel() {
    slides.forEach((slide, index) => {
      slide.hidden = index !== activeIndex;
    });

    dots.forEach((dot, index) => {
      dot.setAttribute("aria-current", index === activeIndex ? "true" : "false");
    });

    prevButton.hidden = activeIndex === 0;
    nextButton.hidden = activeIndex === items.length - 1;
  }

  prevButton.addEventListener("click", (event) => {
    event.stopPropagation();

    if (activeIndex === 0) {
      return;
    }

    activeIndex -= 1;
    syncCarousel();
  });

  nextButton.addEventListener("click", (event) => {
    event.stopPropagation();

    if (activeIndex === items.length - 1) {
      return;
    }

    activeIndex += 1;
    syncCarousel();
  });

  stage.addEventListener("click", (event) => {
    if (event.target.closest(".media-arrow")) {
      return;
    }

    openLightbox(items, basePath, activeIndex);
  });

  syncCarousel();
}

function createMediaNode(item, basePath) {
  const baseUrl = new URL(basePath, window.location.href);

  if (item.type === "embed") {
    const frame = document.createElement("iframe");
    frame.src = item.src;
    frame.title = item.title || "Embedded media";
    frame.loading = "lazy";
    frame.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    frame.allowFullscreen = true;
    return frame;
  }

  if (item.type === "video") {
    const video = document.createElement("video");
    video.controls = true;
    video.preload = "metadata";
    video.src = new URL(item.src, baseUrl).href;

    if (item.poster) {
      video.poster = new URL(item.poster, baseUrl).href;
    }

    return video;
  }

  const image = document.createElement("img");
  image.src = new URL(item.src, baseUrl).href;
  image.alt = item.alt || item.caption || "";
  image.loading = "lazy";
  image.decoding = "async";
  return image;
}

function formatDate(dateString) {
  if (!dateString) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const date = new Date(`${dateString}T00:00:00`);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  if (/^\d{4}-\d{2}$/.test(dateString)) {
    const [year, month] = dateString.split("-");
    const date = new Date(`${year}-${month}-01T00:00:00`);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
    }).format(date);
  }

  return dateString;
}

function humanizeTag(tag) {
  return tag.replaceAll("_", " ");
}

function ensureLightbox() {
  if (document.querySelector("[data-lightbox]")) {
    return;
  }

  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.dataset.lightbox = "true";
  lightbox.hidden = true;
  lightbox.innerHTML = `
    <div class="lightbox-backdrop" data-lightbox-close></div>
    <div class="lightbox-dialog" role="dialog" aria-modal="true" aria-label="Image viewer">
      <button class="lightbox-close" type="button" data-lightbox-close aria-label="Close viewer">×</button>
      <div class="lightbox-frame">
        <button class="lightbox-arrow lightbox-arrow--prev" type="button" data-lightbox-prev aria-label="Previous image">
          <span aria-hidden="true">‹</span>
        </button>
        <div class="lightbox-media" data-lightbox-media></div>
        <button class="lightbox-arrow lightbox-arrow--next" type="button" data-lightbox-next aria-label="Next image">
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <div class="lightbox-thumbs" data-lightbox-thumbs></div>
    </div>
  `;

  document.body.append(lightbox);

  lightbox.addEventListener("click", (event) => {
    if (event.target.matches("[data-lightbox-close]")) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!activeLightbox) {
      return;
    }

    if (event.key === "Escape") {
      closeLightbox();
      return;
    }

    if (event.key === "ArrowLeft") {
      stepLightbox(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      stepLightbox(1);
    }
  });

  lightbox.querySelector("[data-lightbox-prev]").addEventListener("click", () => {
    stepLightbox(-1);
  });

  lightbox.querySelector("[data-lightbox-next]").addEventListener("click", () => {
    stepLightbox(1);
  });
}

function openLightbox(items, basePath, startIndex) {
  const lightbox = document.querySelector("[data-lightbox]");

  if (!lightbox) {
    return;
  }

  activeLightbox = {
    items,
    basePath,
    activeIndex: startIndex,
  };

  lightbox.hidden = false;
  document.body.classList.add("lightbox-open");
  syncLightbox();
}

function closeLightbox() {
  const lightbox = document.querySelector("[data-lightbox]");

  if (!lightbox) {
    return;
  }

  activeLightbox = null;
  lightbox.hidden = true;
  document.body.classList.remove("lightbox-open");
}

function stepLightbox(direction) {
  if (!activeLightbox) {
    return;
  }

  const nextIndex = activeLightbox.activeIndex + direction;

  if (nextIndex < 0 || nextIndex >= activeLightbox.items.length) {
    return;
  }

  activeLightbox.activeIndex = nextIndex;
  syncLightbox();
}

function syncLightbox() {
  if (!activeLightbox) {
    return;
  }

  const lightbox = document.querySelector("[data-lightbox]");
  const mediaRoot = lightbox.querySelector("[data-lightbox-media]");
  const thumbsRoot = lightbox.querySelector("[data-lightbox-thumbs]");
  const prevButton = lightbox.querySelector("[data-lightbox-prev]");
  const nextButton = lightbox.querySelector("[data-lightbox-next]");

  mediaRoot.innerHTML = "";
  thumbsRoot.innerHTML = "";

  const currentItem = activeLightbox.items[activeLightbox.activeIndex];
  const mediaNode = createMediaNode(currentItem, activeLightbox.basePath);

  mediaNode.classList.add("lightbox-media__asset");
  mediaRoot.append(mediaNode);

  activeLightbox.items.forEach((item, index) => {
    const thumbButton = document.createElement("button");
    thumbButton.className = "lightbox-thumb";
    thumbButton.type = "button";
    thumbButton.setAttribute("aria-current", index === activeLightbox.activeIndex ? "true" : "false");
    thumbButton.setAttribute("aria-label", `Open image ${index + 1}`);

    const thumbNode = createMediaNode(item, activeLightbox.basePath);
    thumbNode.classList.add("lightbox-thumb__asset");
    thumbButton.append(thumbNode);

    thumbButton.addEventListener("click", () => {
      activeLightbox.activeIndex = index;
      syncLightbox();
    });

    thumbsRoot.append(thumbButton);
  });

  prevButton.hidden = activeLightbox.activeIndex === 0;
  nextButton.hidden = activeLightbox.activeIndex === activeLightbox.items.length - 1;
}
