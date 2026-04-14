const events = Array.isArray(window.TOP_SLOP_EVENTS) ? window.TOP_SLOP_EVENTS : [];
const mediaLibrary = window.TOP_SLOP_MEDIA || {};

if (document.body.dataset.page === "list") {
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
    <div class="media-stage" data-media-stage></div>
    <div class="media-dots" data-media-dots aria-label="Carousel pagination"></div>
  `;

  const stage = shell.querySelector("[data-media-stage]");
  const dotContainer = shell.querySelector("[data-media-dots]");
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
  }

  if (items.length > 1) {
    stage.addEventListener("click", () => {
      activeIndex = (activeIndex + 1) % items.length;
      syncCarousel();
    });
  }

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
