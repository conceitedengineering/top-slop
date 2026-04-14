const events = Array.isArray(window.TOP_SLOP_EVENTS) ? window.TOP_SLOP_EVENTS : [];
const mediaLibrary = window.TOP_SLOP_MEDIA || {};

const page = document.body.dataset.page;

if (page === "home") {
  window.requestAnimationFrame(() => {
    document.body.classList.add("is-ready");
  });
}

if (page === "list") {
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

      const yearHeading = document.createElement("div");
      yearHeading.className = "timeline-year";
      yearHeading.textContent = year;
      container.append(yearHeading);
    }

    const details = document.createElement("details");
    details.className = "timeline-entry";
    details.dataset.slug = event.slug;

    const summary = document.createElement("summary");
    summary.innerHTML = `
      <div class="entry-header">
        <p class="entry-date">${formatDate(event.breakoutDate)}</p>
        <h2 class="entry-title">${event.entry}</h2>
        <p class="entry-subtitle">${event.format}</p>
      </div>
      <span class="entry-plus" aria-hidden="true">+</span>
    `;

    const panel = document.createElement("div");
    panel.className = "entry-panel";
    panel.innerHTML = `
      <section class="media-shell" data-media-shell>
        <div class="media-stage">
          <div class="media-empty">
            <p>Media has not been added yet for <strong>${event.entry}</strong>.</p>
          </div>
        </div>
        <div class="media-controls">
          <p class="media-caption">Add media files in <code>media/${event.slug}/</code> and register them in <code>data/media.js</code>.</p>
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
            <span class="meta-label">AI Role</span>
            <p class="meta-value">${event.aiRole}</p>
          </div>
          <div class="meta-block">
            <span class="meta-label">Aesthetic Mode</span>
            <p class="meta-value">${event.aestheticMode}</p>
          </div>
          <div class="meta-block">
            <span class="meta-label">Institutional Response</span>
            <p class="meta-value">${event.institutionalResponse}</p>
          </div>
        </div>
        <div class="meta-block">
          <span class="meta-label">Pattern Tags</span>
          <div class="tag-list">
            ${event.patternTags.map((tag) => `<span class="tag">${humanizeTag(tag)}</span>`).join("")}
          </div>
        </div>
      </section>
    `;

    details.append(summary, panel);
    details.addEventListener("toggle", () => {
      if (details.open && !details.dataset.mediaLoaded) {
        void hydrateMedia(details, event);
      }
    });

    container.append(details);
  }
}

async function hydrateMedia(details, event) {
  const shell = details.querySelector("[data-media-shell]");

  if (!shell) {
    return;
  }

  details.dataset.mediaLoaded = "true";

  const manifest = mediaLibrary[event.slug];
  const items = Array.isArray(manifest?.items) ? manifest.items : [];

  if (items.length === 0) {
    renderEmptyMedia(shell, event);
    return;
  }

  renderGallery(shell, items, `./media/${event.slug}/`);
}

function renderEmptyMedia(shell, event) {
  shell.innerHTML = `
    <div class="media-stage">
      <div class="media-empty">
        <div>
          <p>Media has not been added yet for <strong>${event.entry}</strong>.</p>
          <p>Drop files into <code>media/${event.slug}/</code> and register them in <code>data/media.js</code>.</p>
        </div>
      </div>
    </div>
    <div class="media-controls">
      <p class="media-caption">Images, local video files, and embeds are all supported.</p>
    </div>
  `;
}

function renderGallery(shell, items, basePath) {
  shell.innerHTML = `
    <div class="media-stage" data-media-stage></div>
    <div class="media-controls">
      <p class="media-caption" data-media-caption></p>
      <div class="media-nav">
        <button class="media-button" type="button" data-media-prev aria-label="Previous slide">←</button>
        <p class="media-counter" data-media-counter></p>
        <button class="media-button" type="button" data-media-next aria-label="Next slide">→</button>
      </div>
    </div>
  `;

  const stage = shell.querySelector("[data-media-stage]");
  const counter = shell.querySelector("[data-media-counter]");
  const caption = shell.querySelector("[data-media-caption]");
  const prevButton = shell.querySelector("[data-media-prev]");
  const nextButton = shell.querySelector("[data-media-next]");

  let activeIndex = 0;

  const slides = items.map((item, index) => {
    const slide = document.createElement("div");
    slide.className = "media-slide";
    slide.hidden = index !== activeIndex;
    slide.append(createMediaNode(item, basePath));
    stage.append(slide);
    return slide;
  });

  function syncGallery() {
    slides.forEach((slide, index) => {
      slide.hidden = index !== activeIndex;
    });

    counter.textContent = `${activeIndex + 1} / ${items.length}`;
    caption.textContent = items[activeIndex].caption || items[activeIndex].title || "";
    prevButton.hidden = items.length < 2;
    nextButton.hidden = items.length < 2;
  }

  prevButton.addEventListener("click", () => {
    activeIndex = (activeIndex - 1 + items.length) % items.length;
    syncGallery();
  });

  nextButton.addEventListener("click", () => {
    activeIndex = (activeIndex + 1) % items.length;
    syncGallery();
  });

  syncGallery();
}

function createMediaNode(item, basePath) {
  const baseUrl = new URL(basePath, window.location.href);

  if (item.type === "embed") {
    const frame = document.createElement("iframe");
    frame.src = item.src;
    frame.title = item.title || "Embedded media";
    frame.loading = "lazy";
    frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
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
