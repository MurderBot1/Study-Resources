/*
 * Flashcard deck app: flashcard mode + quiz mode with fuzzy-search answers.
 * Expects window.DECK = { id, title, cards: [{ n, term, def }, ...] } and window.Fuzzy (fuzzy.js).
 * Preferences (mode, direction, shuffle, and the card range once the user picks one) are kept in
 * localStorage under "studyresources:deck:<deck id>".
 */
(function () {
  "use strict";

  const DECK = window.DECK;
  const Fuzzy = window.Fuzzy;
  const CARDS = DECK.cards;
  const N = CARDS.length;
  const BY_N = {};
  CARDS.forEach((c) => { BY_N[c.n] = c; });
  const IDX_TERMS = Fuzzy.index(CARDS, (c) => c.term);
  const IDX_DEFS = Fuzzy.index(CARDS, (c) => c.def);
  const MAX_OPTIONS = 8;

  // ---------- preferences ----------
  const KEY = "studyresources:deck:" + DECK.id;
  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function savePrefs() {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* storage unavailable */ }
  }
  const prefs = loadPrefs();
  const validRange = (r) =>
    Array.isArray(r) && r.length === 2 && Number.isInteger(r[0]) && Number.isInteger(r[1]) &&
    r[0] >= 1 && r[1] <= N && r[0] <= r[1];
  if (!validRange(prefs.range)) delete prefs.range;   // default 1..N until the user picks a range
  if (prefs.mode !== "quiz") prefs.mode = "cards";

  const range = () => (prefs.range ? { from: prefs.range[0], to: prefs.range[1] } : { from: 1, to: N });
  const inRange = () => { const r = range(); return CARDS.filter((c) => c.n >= r.from && c.n <= r.to); };

  // ---------- helpers ----------
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    });
    kids.flat().forEach((c) => { if (c != null && c !== false) e.append(c); });
    return e;
  }
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function highlight(text, ranges) {
    const out = [];
    let pos = 0;
    (ranges || []).forEach(([s, e]) => {
      if (s > pos) out.push(text.slice(pos, s));
      out.push(h("mark", { text: text.slice(s, e) }));
      pos = e;
    });
    if (pos < text.length) out.push(text.slice(pos));
    return out;
  }
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);

  // ---------- state ----------
  let fc = null;     // flashcard session: { order: [n...], i }
  let quiz = null;   // quiz session
  const view = document.getElementById("view");
  const controls = document.getElementById("controls");

  const quizRunning = () => !!(quiz && !quiz.finished);

  // ---------- controls ----------
  const ui = {};
  function buildControls() {
    ui.modeBtns = [
      h("button", { type: "button", "data-mode": "cards", text: "Flashcards", onclick: () => setMode("cards") }),
      h("button", { type: "button", "data-mode": "quiz", text: "Quiz", onclick: () => setMode("quiz") })
    ];
    ui.dirBtns = [
      h("button", { type: "button", "data-rev": "0", text: "Term → Definition", onclick: () => setReverse(false) }),
      h("button", { type: "button", "data-rev": "1", text: "Reverse: Definition → Term", onclick: () => setReverse(true) })
    ];
    ui.from = h("input", { type: "number", id: "range-from", min: 1, max: N, step: 1, inputmode: "numeric", "aria-label": "First card number", onchange: () => onRange("from") });
    ui.to = h("input", { type: "number", id: "range-to", min: 1, max: N, step: 1, inputmode: "numeric", "aria-label": "Last card number", onchange: () => onRange("to") });
    ui.count = h("span", { class: "count", "aria-live": "polite" });
    ui.reset = h("button", { type: "button", class: "link-btn", onclick: resetRange });
    ui.note = h("p", { class: "range-note" });

    controls.append(
      h("div", { class: "controls-row" },
        h("div", { class: "seg", role: "group", "aria-label": "Mode" }, ui.modeBtns),
        h("div", { class: "seg", role: "group", "aria-label": "Direction" }, ui.dirBtns)),
      h("div", { class: "controls-row" },
        h("span", { class: "field-label", text: "Cards" }),
        h("div", { class: "range" },
          h("label", { for: "range-from", class: "range-note", text: "from" }), ui.from,
          h("label", { for: "range-to", class: "range-note", text: "to" }), ui.to,
          ui.count, ui.reset)),
      ui.note
    );
    syncControls();
  }
  function syncControls() {
    const locked = quizRunning();
    controls.hidden = locked;   // settings are hidden (and locked) while a quiz is in progress
    ui.modeBtns.forEach((b) => { b.setAttribute("aria-pressed", String(b.dataset.mode === prefs.mode)); b.disabled = locked; });
    ui.dirBtns.forEach((b) => { b.setAttribute("aria-pressed", String((b.dataset.rev === "1") === !!prefs.reverse)); b.disabled = locked; });
    const r = range();
    ui.from.value = r.from; ui.to.value = r.to;
    ui.from.disabled = ui.to.disabled = locked;
    ui.count.textContent = "of " + N + " · " + plural(inRange().length, "card", "cards") + " selected";
    ui.reset.textContent = "Reset to 1–" + N;
    ui.reset.disabled = locked || !prefs.range;
    ui.reset.hidden = !prefs.range;
    ui.note.textContent = prefs.range
      ? "Your range is saved on this device."
      : "Defaults to every card. Choose a range and it will be remembered.";
  }
  function setMode(m) {
    if (quizRunning()) return;
    prefs.mode = m; savePrefs(); syncControls(); render();
  }
  function setReverse(rev) {
    if (quizRunning()) return;
    prefs.reverse = rev; savePrefs(); syncControls(); render();
  }
  function onRange(which) {
    let a = parseInt(ui.from.value, 10), b = parseInt(ui.to.value, 10);
    const cur = range();
    if (!Number.isInteger(a)) a = cur.from;
    if (!Number.isInteger(b)) b = cur.to;
    a = Math.min(Math.max(a, 1), N);
    b = Math.min(Math.max(b, 1), N);
    if (a > b) { if (which === "from") b = a; else a = b; }
    prefs.range = [a, b];
    savePrefs(); fc = null; quiz = null; syncControls(); render();
  }
  function resetRange() {
    delete prefs.range; savePrefs(); fc = null; quiz = null; syncControls(); render();
  }

  // ---------- flashcard mode ----------
  function startCards() {
    let order = inRange().map((c) => c.n);
    if (prefs.shuffleCards) order = shuffle(order);
    fc = { order, i: 0 };
  }

  function renderCards() {
    if (!fc) startCards();
    const card = BY_N[fc.order[fc.i]];
    const total = fc.order.length;
    const frontKind = prefs.reverse ? "def" : "term";
    const backKind = prefs.reverse ? "term" : "def";

    const face = (kind, cls, hidden) =>
      h("div", { class: "fc-face " + cls, "aria-hidden": hidden ? "true" : "false" },
        h("span", { class: "fc-num", text: "#" + card.n }),
        h("span", { class: "fc-side", text: kind === "term" ? "Term" : "Definition" }),
        h("div", { class: "fc-text " + kind, text: kind === "term" ? card.term : card.def }),
        cls === "front" ? h("span", { class: "fc-tip", text: "Click the card or press Space to flip" }) : null);
    const front = face(frontKind, "front", false);
    const back = face(backKind, "back", true);
    const cardBtn = h("button", { type: "button", class: "fc-card", id: "fc-card", "aria-label": "Flashcard. Activate to flip." }, front, back);
    cardBtn.addEventListener("click", () => {
      const flipped = cardBtn.classList.toggle("flipped");
      front.setAttribute("aria-hidden", String(flipped));
      back.setAttribute("aria-hidden", String(!flipped));
    });

    view.replaceChildren(
      h("div", { class: "meta-row" },
        h("span", { text: "Card " + (fc.i + 1) + " of " + total }),
        h("span", { text: prefs.shuffleCards ? "Shuffled" : "In order" })),
      h("div", { class: "bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": total, "aria-valuenow": fc.i + 1 },
        h("i", { style: "width:" + ((fc.i + 1) / total * 100) + "%" })),
      h("div", { class: "fc" }, cardBtn),
      h("div", { class: "fc-nav" },
        h("button", { type: "button", class: "btn ghost", text: "← Previous", onclick: () => step(-1) }),
        h("button", { type: "button", class: "btn ghost shuffle", "aria-pressed": String(!!prefs.shuffleCards), text: prefs.shuffleCards ? "Shuffle: on" : "Shuffle: off", onclick: toggleShuffleCards }),
        h("button", { type: "button", class: "btn", text: "Next →", onclick: () => step(1) })));
  }
  function step(d) {
    const total = fc.order.length;
    fc.i = (fc.i + d + total) % total;
    renderCards();
  }
  function toggleShuffleCards() {
    prefs.shuffleCards = !prefs.shuffleCards; savePrefs(); startCards(); renderCards();
  }

  // ---------- quiz mode ----------
  function startQuiz(cards) {
    let list = cards || inRange();
    if (prefs.shuffleQuiz !== false) list = shuffle(list);
    quiz = { cards: list, i: 0, right: 0, log: [], answered: false, finished: false, reverse: !!prefs.reverse, lastPick: null };
    syncControls(); render();
  }

  function renderQuizSetup() {
    const n = inRange().length;
    const r = range();
    view.replaceChildren(
      h("div", { class: "card" },
        h("h2", { text: "Quiz yourself" }),
        h("p", { class: "muted", text: prefs.reverse
          ? "You’ll see a definition. Start typing the term’s name, then pick it from the list of matches."
          : "You’ll see a term. Type a few words you remember from its definition, then pick the matching definition from the list." }),
        h("p", { class: "muted", text: "Typos are fine — the search is fuzzy. Cards #" + r.from + "–" + r.to + " (" + plural(n, "question", "questions") + ")." }),
        h("label", { class: "check" },
          h("input", { type: "checkbox", id: "shuffle-quiz", checked: prefs.shuffleQuiz !== false ? true : null,
            onchange: (e) => { prefs.shuffleQuiz = e.target.checked; savePrefs(); } }),
          "Shuffle questions"),
        h("div", { class: "row" },
          h("button", { type: "button", class: "btn", id: "start-quiz", text: "Start quiz", onclick: () => startQuiz() }))));
  }

  function renderQuestion() {
    const card = quiz.cards[quiz.i];
    const total = quiz.cards.length;
    const reverse = quiz.reverse;
    const answered = quiz.answered;

    const header = [
      h("div", { class: "meta-row" },
        h("span", { text: "Question " + (quiz.i + 1) + " of " + total }),
        h("span", { text: quiz.right + " correct" })),
      h("div", { class: "bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": total, "aria-valuenow": quiz.i + (answered ? 1 : 0) },
        h("i", { style: "width:" + ((quiz.i + (answered ? 1 : 0)) / total * 100) + "%" }))
    ];

    const prompt = h("div", {},
      h("div", { class: "q-prompt-label", text: reverse ? "Which term matches this definition?" : "Which definition matches this term?" }),
      h("p", { class: "q-prompt " + (reverse ? "def" : "term"), text: reverse ? card.def : card.term }));

    const body = [prompt];
    if (!answered) {
      body.push(buildCombo(card));
    } else {
      body.push(buildResult(card));
    }

    view.replaceChildren(...header,
      h("div", { class: "card" }, body),
      h("div", { class: "row between" },
        h("button", { type: "button", class: "btn ghost", text: "End quiz", onclick: endQuiz }),
        answered ? h("button", { type: "button", class: "btn", id: "next-q", text: quiz.i + 1 >= total ? "See results" : "Next question →", onclick: nextQuestion }) : null));

    if (answered) document.getElementById("next-q").focus();
    else document.getElementById("answer").focus({ preventScroll: true });
  }

  function buildCombo(card) {
    const reverse = quiz.reverse;
    const idx = reverse ? IDX_TERMS : IDX_DEFS;
    const textOf = (c) => (reverse ? c.term : c.def);
    let results = [];
    let active = 0;

    const input = h("input", {
      type: "text", id: "answer", role: "combobox", autocomplete: "off", autocapitalize: "off", spellcheck: "false",
      "aria-autocomplete": "list", "aria-expanded": "false", "aria-controls": "options",
      "aria-label": reverse ? "Type the term name" : "Type words from the definition",
      placeholder: reverse ? "Type the term’s name…" : "Type words from the definition…"
    });
    const list = h("ul", { id: "options", class: "listbox", role: "listbox", hidden: true });

    const setOpen = (open) => { list.hidden = !open; input.setAttribute("aria-expanded", String(open)); };
    function setActive(i, scroll) {
      active = i;
      [...list.children].forEach((li, k) => {
        const on = k === i;
        li.classList.toggle("active", on);
        li.setAttribute("aria-selected", String(on));
        if (on) { input.setAttribute("aria-activedescendant", li.id); if (scroll) li.scrollIntoView({ block: "nearest" }); }
      });
    }
    function paint() {
      list.replaceChildren();
      input.removeAttribute("aria-activedescendant");
      if (!input.value.trim()) { setOpen(false); return; }
      if (!results.length) {
        list.append(h("li", { class: "option none", role: "presentation", text: "No matches — try different words" }));
        setOpen(true); return;
      }
      results.forEach((r, i) => {
        const li = h("li", { class: "option " + (reverse ? "term" : "def"), role: "option", id: "opt-" + i, "aria-selected": "false" }, highlight(textOf(r.item), r.ranges));
        li.addEventListener("mousedown", (e) => { e.preventDefault(); pick(r.item.n); });
        li.addEventListener("mousemove", () => { if (active !== i) setActive(i, false); });
        list.append(li);
      });
      setOpen(true);
      setActive(0, false);
    }
    function pick(n) {
      if (quiz.answered) return;
      quiz.answered = true;
      quiz.lastPick = n;
      if (n === card.n) quiz.right++;
      quiz.log.push({ card, picked: n });
      renderQuestion();
    }
    input.addEventListener("input", () => {
      results = Fuzzy.search(idx, input.value, MAX_OPTIONS);
      paint();
    });
    input.addEventListener("focus", () => { if (input.value.trim()) setOpen(true); });
    input.addEventListener("blur", () => setOpen(false));
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" && results.length) { e.preventDefault(); setOpen(true); setActive((active + 1) % results.length, true); }
      else if (e.key === "ArrowUp" && results.length) { e.preventDefault(); setOpen(true); setActive((active - 1 + results.length) % results.length, true); }
      else if (e.key === "Enter") { e.preventDefault(); if (results.length && !list.hidden) pick(results[active].item.n); }
      else if (e.key === "Escape") { input.value = ""; results = []; paint(); }
    });

    return h("div", {},
      h("div", { class: "combo" }, input, list),
      h("p", { class: "muted", style: "margin-top:10px", text: reverse
        ? "Pick the term from the dropdown (↑ ↓ then Enter)."
        : "Pick the definition from the dropdown (↑ ↓ then Enter)." }),
      h("div", { class: "row", style: "margin-top:6px" },
        h("button", { type: "button", class: "link-btn", text: "I don’t know — show the answer", onclick: () => {
          quiz.answered = true; quiz.lastPick = null; quiz.log.push({ card, picked: null }); renderQuestion();
        } })));
  }

  function answerCard(card) {
    return h("div", { class: "answer-card" },
      h("span", { class: "t", text: "#" + card.n + " " + card.term }),
      h("span", { text: card.def }));
  }

  function buildResult(card) {
    const ok = quiz.lastPick === card.n;
    const children = [h("span", { class: "verdict", text: ok ? "Correct!" : quiz.lastPick == null ? "Skipped" : "Not quite" })];
    if (!ok && quiz.lastPick != null) {
      const chosen = BY_N[quiz.lastPick];
      children.push(h("span", { class: "chosen", text: "You chose: " + (quiz.reverse ? chosen.term : chosen.def) }));
    }
    children.push(answerCard(card));
    return h("div", { class: "result " + (ok ? "good" : "bad"), role: "status" }, children);
  }

  function nextQuestion() {
    if (quiz.i + 1 >= quiz.cards.length) { quiz.finished = true; syncControls(); render(); return; }
    quiz.i++; quiz.answered = false; quiz.lastPick = null; renderQuestion();
  }
  function endQuiz() {
    if (!quiz.log.length) { quiz = null; syncControls(); render(); return; }
    quiz.finished = true; syncControls(); render();
  }

  function renderResults() {
    const answered = quiz.log.length;
    const missed = quiz.log.filter((l) => l.picked !== l.card.n);
    const pct = answered ? Math.round(quiz.right / answered * 100) : 0;
    view.replaceChildren(
      h("div", { class: "card" },
        h("div", { class: "q-prompt-label", text: "Your score" }),
        h("div", { class: "score", text: quiz.right + " / " + answered }),
        h("p", { class: "muted", text: pct + "% correct" + (answered < quiz.cards.length ? " · quiz ended early" : "") }),
        h("div", { class: "row" },
          missed.length ? h("button", { type: "button", class: "btn", text: "Retry " + plural(missed.length, "missed card", "missed cards"), onclick: () => startQuiz(missed.map((l) => l.card)) }) : null,
          h("button", { type: "button", class: missed.length ? "btn ghost" : "btn", text: "New quiz", onclick: () => { quiz = null; syncControls(); render(); } }))),
      missed.length ? h("div", { class: "card" },
        h("h2", { text: "Review missed cards" }),
        missed.map((l) => h("div", { class: "miss" },
          h("span", { class: "t", text: "#" + l.card.n + " " + l.card.term }),
          l.picked != null ? h("span", { class: "you", text: "You chose: " + (quiz.reverse ? BY_N[l.picked].term : BY_N[l.picked].def) }) : h("span", { class: "you", text: "Skipped" }),
          h("span", { class: "ans", text: "Answer: " + (quiz.reverse ? l.card.term : l.card.def) })))) : null);
    window.scrollTo(0, 0);
  }

  // ---------- routing ----------
  function render() {
    if (prefs.mode === "cards") renderCards();
    else if (!quiz) renderQuizSetup();
    else if (quiz.finished) renderResults();
    else renderQuestion();
  }

  document.addEventListener("keydown", (e) => {
    if (prefs.mode !== "cards" || !fc) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    else if (e.key === " " && (t === document.body || t === document.documentElement)) {
      e.preventDefault();
      const c = document.getElementById("fc-card");
      if (c) c.click();
    }
  });

  buildControls();
  render();
})();
