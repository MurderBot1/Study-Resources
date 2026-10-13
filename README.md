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

To preview locally, run `python3 -m http.server` in this folder and open <http://localhost:8000>. Quizzes load their YAML file with `fetch`, so open the site through a web server instead of double-clicking the HTML files.

## Terms quiz flashcards

`classes/apush-williams/flashcards/terms/`

- **Flashcards mode:** click the card (or press Space) to flip it, and use ← / → to move between cards. There's also a shuffle toggle.
- **Quiz mode:** you're shown a card and type your answer. A fuzzy search (typo-tolerant, ignores case, accents and punctuation) suggests matches in a dropdown, and you pick one with the mouse or with ↑ ↓ + Enter. Missed cards are listed at the end and can be retried.
- **Reverse:** flips the direction in both modes.
  - Normal: you see the **term** and pick its **definition**.
  - Reverse: you see the **definition** and pick the **term**.
- **Range:** choose which cards to study (`from` – `to`). It defaults to the full deck (1–230) until you choose one. After that it's remembered in your browser (`localStorage`), and "Reset" returns to the default.

## Quizzes

All quizzes use one shared page, `quiz.html`, and each quiz is just a YAML file in `classes/<class>/quizzes/`. The class page links to it as `quiz.html?class=<class id>&quiz=<file name without .yml>`.

- **Hints:** every question has a hint. The student taps **Show hint** (or presses `H`) to see it. The results page counts how many questions used a hint.
- **Setup:** choose topics, the number of questions, and whether to shuffle questions and answer order. These choices are remembered in the browser.
- **After each answer:** the correct choice is highlighted, with the optional explanation.
- **Results:** score, per-topic breakdown, a review of missed questions, and a "Retry missed" button.
- **Keys:** `1`–`4` or `A`–`D` to answer, `H` for the hint, `Enter` or `N` for the next question.

### Quiz file format

```yaml
title: Early Republic Quiz
description: One sentence shown under the title.
topics:                      # groups the student can pick from
  constitution:
    title: The Constitution
    description: Optional second line.
questions:                   # keyed by question number
  1:
    topic: constitution      # a key from `topics`
    question: Who wrote Federalist #10?
    A: Alexander Hamilton
    B: James Madison
    C: John Jay
    D: Thomas Jefferson
    answer: B                # the letter of the right choice
    hint: He is often called the "Father of the Constitution."
    explanation: Madison, writing as "Publius" with Hamilton and Jay.   # optional
    shuffle: false           # optional: keep the choices in this order (for "All of the above")
```

Use 2 to 6 choices (`A`, `B`, `C`, ...). Put quotes around any text that has a `:` followed by a space, starts with a quote or symbol, or is `True`/`False`/a number. If a quiz has a mistake, the page shows exactly which question to fix.

## Adding things

Everything listed on the home and class pages comes from **`assets/js/catalog.js`**.

- **New quiz:** add a `<name>.yml` file (format above) to `classes/<class>/quizzes/`, then add `{ title, description, meta, quiz: "<name>" }` to that class's `quizzes` list in `catalog.js`.
- **New flashcard deck:** copy `classes/apush-williams/flashcards/terms/` to a new folder and replace the data file. It's a single `window.DECK = { id, title, cards: [{ n, term, def, tag? }] }` object (`tag` is an optional label shown on the card, like a chapter), and the `id` is the key used to save each deck's settings. Then add it to the class's `flashcards` list.
- **New class:** copy `classes/apush-williams/` (keep the `data-class` value on the `<body>` in sync with the `id` in `catalog.js`) and add the class to `catalog.js`.

## Layout

```
index.html                       home: list of classes
quiz.html                        the one shared quiz page
assets/css/site.css              shared styles
assets/css/flashcards.css        deck page styles
assets/css/quiz.css              quiz page styles
assets/js/catalog.js             what's on the site
assets/js/site.js                renders home + class pages from the catalog
assets/js/fuzzy.js               fuzzy search used by quiz mode
assets/js/flashcards.js          flashcard + quiz app (reusable for any deck)
assets/js/quiz.js                multiple-choice quiz app (reads the YAML files)
assets/js/vendor/js-yaml.min.js  YAML parser (js-yaml 4.1.0, MIT license)
classes/apush-williams/
  index.html                     class page
  quizzes/                       enduring-vision.yml, early-republic.yml
  flashcards/terms/              Terms quiz flashcards (+ terms-data.js)
  flashcards/enduring-vision/    Enduring Vision flashcards (+ deck-data.js)
```

The terms were imported from the Quizlet export "DHS Mr. Williams APUSH terms (in order)". A few obvious typos were corrected (for example "Millitary" → "Military" and "Pendelton" → "Pendleton"), and the terms that Quizlet split across page breaks were put back together.
