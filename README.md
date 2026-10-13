# Study Resources

Quizzes and flashcards to share with classmates. It's a plain static site (HTML, CSS and JS with no build step), so it works on GitHub Pages as-is.

## Classes

| Class | Quizzes | Flashcards |
| --- | --- | --- |
| **APUSH – Williams** (`classes/apush-williams/`) | Enduring Vision Quiz, Early Republic Quiz | Terms quiz flashcards (230 terms), Enduring Vision flashcards (111 cards) |

## Publish with GitHub Pages

1. In the repo, go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, pick the branch (`main` once this is merged) and the `/ (root)` folder, then save.
3. The site is served at `https://<user>.github.io/Study-Resources/`. All links are relative, so it works under that sub-path.

To preview locally, run `python3 -m http.server` in this folder and open <http://localhost:8000>.

## Terms quiz flashcards

`classes/apush-williams/flashcards/terms/`

- **Flashcards mode:** click the card (or press Space) to flip it, and use ← / → to move between cards. There's also a shuffle toggle.
- **Quiz mode:** you're shown a card and type your answer. A fuzzy search (typo-tolerant, ignores case, accents and punctuation) suggests matches in a dropdown, and you pick one with the mouse or with ↑ ↓ + Enter. Missed cards are listed at the end and can be retried.
- **Reverse:** flips the direction in both modes.
  - Normal: you see the **term** and pick its **definition**.
  - Reverse: you see the **definition** and pick the **term**.
- **Range:** choose which cards to study (`from` – `to`). It defaults to the full deck (1–230) until you choose one. After that it's remembered in your browser (`localStorage`), and "Reset" returns to the default.

## Adding things

Everything listed on the home and class pages comes from **`assets/js/catalog.js`**.

- **New quiz:** drop a standalone `.html` file into `classes/<class>/quizzes/` and add an entry to that class's `quizzes` list in `catalog.js`.
- **New flashcard deck:** copy `classes/apush-williams/flashcards/terms/` to a new folder and replace the data file. It's a single `window.DECK = { id, title, cards: [{ n, term, def, tag? }] }` object (`tag` is an optional label shown on the card, like a chapter), and the `id` is the key used to save each deck's settings. Then add it to the class's `flashcards` list.
- **New class:** copy `classes/apush-williams/` (keep the `data-class` value on the `<body>` in sync with the `id` in `catalog.js`) and add the class to `catalog.js`.

## Layout

```
index.html                       home: list of classes
assets/css/site.css              shared styles
assets/css/flashcards.css        deck page styles
assets/js/catalog.js             what's on the site
assets/js/site.js                renders home + class pages from the catalog
assets/js/fuzzy.js               fuzzy search used by quiz mode
assets/js/flashcards.js          flashcard + quiz app (reusable for any deck)
classes/apush-williams/
  index.html                     class page
  quizzes/                       Enduring Vision Quiz, Early Republic Quiz
  flashcards/terms/              Terms quiz flashcards (+ terms-data.js)
  flashcards/enduring-vision/    Enduring Vision flashcards (+ deck-data.js)
```

The terms were imported from the Quizlet export "DHS Mr. Williams APUSH terms (in order)". A few obvious typos were corrected (for example "Millitary" → "Military" and "Pendelton" → "Pendleton"), and the terms that Quizlet split across page breaks were put back together.
