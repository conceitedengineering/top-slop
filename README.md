# Top Slop V1

Static HTML, CSS, and native JavaScript. No backend. No framework.

## Files

- `index.html`: landing page with the title-drop animation
- `list.html`: breakout-date timeline with multi-open details
- `essay.html`: essay placeholder page
- `styles.css`: shared site styling
- `app.js`: native rendering + media gallery logic
- `data/events.js`: the event dataset for V1
- `data/media.js`: optional per-entry media manifests
- `media/README.md`: how to attach images, local video, and embeds per entry

## Open It

You can open `index.html` directly in the browser with `file://`.

If you prefer a local server, this still works:

```bash
python3 -m http.server 8000
```

Then open [http://127.0.0.1:8000](http://127.0.0.1:8000).

## Updating Content

For V1, edit `data/events.js` directly.

For media:

1. Find the event slug in `data/events.js`
2. Add files to `media/<slug>/`
3. Add the entry to `data/media.js` using the example in `media/README.md`

For the essay:

- Replace the copy inside `essay.html`
