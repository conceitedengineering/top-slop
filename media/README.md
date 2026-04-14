# Media Folder Conventions

Each event gets its own folder under `media/` using the slug from `data/events.js`.

Example:

```text
media/balenciaga-pope/
media/heart-on-my-sleeve-ghostwriter977/
```

Put images and local video files inside the matching folder, then register them in
`data/media.js`.

Example `data/media.js` entry:

```js
window.TOP_SLOP_MEDIA = {
  "balenciaga-pope": {
    items: [
      {
        type: "image",
        src: "still-01.jpg",
        alt: "Balenciaga Pope viral image",
        caption: "The image that circulated as if it were a real paparazzi shot."
      },
      {
        type: "video",
        src: "clip.mp4",
        poster: "poster.jpg",
        caption: "Short local video file with optional poster image."
      },
      {
        type: "embed",
        src: "https://www.youtube.com/embed/VIDEO_ID",
        title: "YouTube embed",
        caption: "External embed for a hosted video."
      }
    ]
  }
};
```

Why this lives in `data/media.js`:

This avoids `fetch()` and module loading, so the site still works when you open
it directly from disk with `file://`.
