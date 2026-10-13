/*
 * Shared multiple-choice quiz app (quiz.html?class=<class id>&quiz=<quiz slug>).
 * Loads classes/<class>/quizzes/<quiz>.yml (format documented in README.md) with js-yaml.
 * Preferences (topics, question count, shuffles) are kept in localStorage per quiz.
 */
(function () {
  "use strict";

  const SAFE = /^[a-z0-9][a-z0-9-]*$/;
  const LETTERS = "ABCDEF";
  const params = new URLSearchParams(location.search);
  const classId = params.get("class") || "";
  const slug = params.get("quiz") || "";
  const root = document.getElementById("quiz-root");
  const catalog = window.CATALOG || { classes: [] };
  const cls = catalog.classes.filter((c) => c.id === classId)[0];

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
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
  const str = (v) => (v == null ? "" : String(v));

  // ---------- load + validate ----------
  function parseQuiz(data) {
    const errors = [];
    if (!data || typeof data !== "object") throw new Error("The quiz file is empty or isn't a YAML mapping.");
    const topics = {};
    Object.keys(data.topics || {}).forEach((k) => {
      const t = data.topics[k];
      topics[k] = typeof t === "string" ? { title: t } : { title: str(t && t.title) || k, description: str(t && t.description) };
    });
    const qmap = data.questions;
    if (!qmap || typeof qmap !== "object") throw new Error("The quiz file has no `questions` section.");
    const questions = Object.keys(qmap).map(Number).sort((a, b) => a - b).map((n) => {
      const q = qmap[n] || {};
      const choices = [];
      for (const L of LETTERS) { if (q[L] == null || q[L] === "") break; choices.push(str(q[L])); }
      const answer = LETTERS.indexOf(str(q.answer).toUpperCase());
      const topic = q.topic != null ? str(q.topic) : "all";
      if (!q.question) errors.push("Question " + n + ": missing `question`.");
      if (choices.length < 2) errors.push("Question " + n + ": needs at least choices A and B.");
      if (answer < 0 || answer >= choices.length) errors.push("Question " + n + ": `answer` must be one of the choice letters.");
      if (!topics[topic]) topics[topic] = { title: topic === "all" ? "All questions" : topic, description: "" };
      return {
        n, topic, text: str(q.question), choices, answer,
        hint: str(q.hint).trim(), explanation: str(q.explanation).trim(), shuffle: q.shuffle !== false
      };
    });
    if (!questions.length) errors.push("The quiz has no questions.");
    if (errors.length) throw new Error(errors.join("\n"));
    return { title: str(data.title) || slug, description: str(data.description), topics, questions };
  }

  async function loadQuiz() {
    if (!SAFE.test(classId) || !SAFE.test(slug)) throw new Error("This link doesn't point to a quiz.");
    const res = await fetch("classes/" + classId + "/quizzes/" + slug + ".yml", { cache: "no-cache" });
    if (!res.ok) throw new Error("Couldn't find that quiz (" + res.status + ").");
    return parseQuiz(window.jsyaml.load(await res.text()));
  }

  // ---------- state ----------
  let QUIZ = null;
  let prefs = {};
  let run = null;   // { items, i, right, log, answered, finished, picked }
  let view = null;
  const PREF_KEY = () => "studyresources:quiz:" + classId + "/" + slug;

  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(PREF_KEY())) || {}; } catch (e) { return {}; }
  }
  function savePrefs() {
    try { localStorage.setItem(PREF_KEY(), JSON.stringify(prefs)); } catch (e) { /* storage unavailable */ }
  }

  function prep(q) {
    const idx = q.choices.map((_, i) => i);
    const order = prefs.shuffleAnswers !== false && q.shuffle ? shuffle(idx) : idx;
    return { q, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer), hintShown: false, hintUsed: false };
  }
  function startRun(questions) {
    run = { items: questions.map(prep), i: 0, right: 0, log: [], answered: false, finished: false, picked: null };
    render();
  }

  // ---------- shell ----------
  function buildShell() {
    document.title = QUIZ.title + " · " + (cls ? cls.title : "Study Resources");
    const crumbs = [h("a", { href: "./", text: "All classes" })];
    if (cls) crumbs.push(h("span", { "aria-hidden": "true", text: "/" }), h("a", { href: "classes/" + cls.id + "/", text: cls.title }));
    crumbs.push(h("span", { "aria-hidden": "true", text: "/" }), h("span", { text: QUIZ.title }));
    view = h("div", { id: "view" });
    root.replaceChildren(
      h("nav", { class: "crumbs", "aria-label": "Breadcrumb" }, crumbs),
      h("header", { class: "quiz-head" },
        h("p", { class: "eyebrow", text: "Quiz" }),
        h("h1", { text: QUIZ.title }),
        QUIZ.description ? h("p", { class: "lede", text: QUIZ.description }) : null),
      view);
  }

  // ---------- setup ----------
  function selectedTopics() {
    const saved = Array.isArray(prefs.topics) ? prefs.topics.filter((k) => QUIZ.topics[k]) : [];
    return saved.length ? saved : Object.keys(QUIZ.topics);
  }

  function renderSetup() {
    const counts = {};
    QUIZ.questions.forEach((q) => { counts[q.topic] = (counts[q.topic] || 0) + 1; });
    const keys = Object.keys(QUIZ.topics).filter((k) => counts[k]);
    const chosen = new Set(selectedTopics());

    const poolSize = () => QUIZ.questions.filter((q) => chosen.has(q.topic)).length;
    const num = h("input", { type: "number", id: "count", min: 1, step: 1, inputmode: "numeric", "aria-label": "Number of questions" });
    const start = h("button", { type: "button", class: "btn", id: "start-quiz", text: "Start quiz", onclick: begin });

    function syncCount(keepValue) {
      const n = poolSize();
      num.max = n;
      const want = keepValue && prefs.count ? Math.min(prefs.count, n) : n;
      num.value = Math.max(1, want);
      start.disabled = n === 0;
    }
    function begin() {
      const pool = QUIZ.questions.filter((q) => chosen.has(q.topic));
      const n = Math.max(1, Math.min(parseInt(num.value, 10) || pool.length, pool.length));
      prefs.topics = keys.filter((k) => chosen.has(k));
      prefs.count = n;
      savePrefs();
      startRun((prefs.shuffleQuestions !== false ? shuffle(pool) : pool).slice(0, n));
    }

    const topicRows = keys.map((k) => {
      const t = QUIZ.topics[k];
      const cb = h("input", { type: "checkbox", name: "topic", value: k, checked: chosen.has(k) ? true : null,
        onchange: (e) => { e.target.checked ? chosen.add(k) : chosen.delete(k); syncCount(false); } });
      return h("label", { class: "topic" }, cb,
        h("span", {}, h("b", {}, t.title + " ", h("span", { class: "n", text: "· " + plural(counts[k], "question", "questions") })),
          t.description ? h("small", { text: t.description }) : null));
    });

    num.addEventListener("change", () => { prefs.count = parseInt(num.value, 10) || undefined; });
    syncCount(true);

    view.replaceChildren(h("div", { class: "card" },
      h("h2", { text: "Set up your quiz" }),
      keys.length > 1 ? h("p", { class: "muted", text: "Choose the topics to include." }) : null,
      keys.length > 1 ? h("div", { class: "topics" }, topicRows) : null,
      h("div", { class: "opts" },
        h("label", { class: "check" }, "Questions", num),
        h("label", { class: "check" },
          h("input", { type: "checkbox", id: "shuffle-q", checked: prefs.shuffleQuestions !== false ? true : null,
            onchange: (e) => { prefs.shuffleQuestions = e.target.checked; savePrefs(); } }), "Shuffle questions"),
        h("label", { class: "check" },
          h("input", { type: "checkbox", id: "shuffle-a", checked: prefs.shuffleAnswers !== false ? true : null,
            onchange: (e) => { prefs.shuffleAnswers = e.target.checked; savePrefs(); } }), "Shuffle answer order")),
      h("div", { class: "row" }, start),
      h("p", { class: "kbd-tip", text: "During the quiz: press 1–4 (or A–D) to answer, H for a hint, and Enter for the next question." })));
  }

  // ---------- question ----------
  function renderQuestion() {
    const item = run.items[run.i];
    const total = run.items.length;
    const answered = run.answered;
    const topic = QUIZ.topics[item.q.topic];

    const choiceBtns = item.choices.map((text, i) => {
      const cls = answered ? (i === item.answer ? "good" : i === run.picked ? "bad" : "") : "";
      return h("button", { type: "button", class: "choice " + cls, disabled: answered ? true : null, "data-i": i, onclick: () => choose(i) },
        h("span", { class: "k", text: LETTERS[i] }), h("span", { text }));
    });

    const hintBox = h("div", { class: "hint", id: "hint", role: "note", hidden: item.hintShown ? null : true }, h("b", { text: "Hint" }), item.q.hint);
    const hintBtn = h("button", { type: "button", class: "link-btn", id: "hint-btn", "aria-expanded": String(item.hintShown),
      text: item.hintShown ? "Hide hint" : "Show hint", onclick: toggleHint });

    const body = [
      h("div", { class: "q-topic", text: topic.title }),
      h("p", { class: "q-text", text: item.q.text }),
      h("div", { class: "choices", role: "group", "aria-label": "Answer choices" }, choiceBtns)
    ];
    if (!answered && item.q.hint) body.push(h("div", { class: "hint-row" }, hintBtn, hintBox));
    if (answered) body.push(buildFeedback(item));

    view.replaceChildren(
      h("div", { class: "meta-row" }, h("span", { text: "Question " + (run.i + 1) + " of " + total }), h("span", { text: run.right + " correct" })),
      h("div", { class: "bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": total, "aria-valuenow": run.i + (answered ? 1 : 0) },
        h("i", { style: "width:" + ((run.i + (answered ? 1 : 0)) / total * 100) + "%" })),
      h("div", { class: "card" }, body),
      h("div", { class: "row between" },
        h("button", { type: "button", class: "btn ghost", text: "End quiz", onclick: endQuiz }),
        answered ? h("button", { type: "button", class: "btn", id: "next-q", text: run.i + 1 >= total ? "See results" : "Next question →", onclick: next }) : null));
    if (answered) document.getElementById("next-q").focus();
  }

  function buildFeedback(item) {
    const ok = run.picked === item.answer;
    const kids = [h("span", { class: "verdict", text: ok ? "Correct!" : "Not quite" })];
    if (!ok) kids.push(h("span", { text: "The answer is " + LETTERS[item.answer] + ": " + item.choices[item.answer] }));
    if (item.q.explanation) kids.push(h("span", { class: "why", text: item.q.explanation }));
    return h("div", { class: "result feedback " + (ok ? "good" : "bad"), role: "status" }, kids);
  }

  function toggleHint() {
    const item = run.items[run.i];
    item.hintShown = !item.hintShown;
    if (item.hintShown) item.hintUsed = true;
    document.getElementById("hint").hidden = !item.hintShown;
    const btn = document.getElementById("hint-btn");
    btn.textContent = item.hintShown ? "Hide hint" : "Show hint";
    btn.setAttribute("aria-expanded", String(item.hintShown));
  }

  function choose(i) {
    if (run.answered) return;
    const item = run.items[run.i];
    run.answered = true;
    run.picked = i;
    if (i === item.answer) run.right++;
    run.log.push({ item, picked: i });
    renderQuestion();
  }
  function next() {
    if (run.i + 1 >= run.items.length) { run.finished = true; render(); return; }
    run.i++; run.answered = false; run.picked = null;
    renderQuestion();
  }
  function endQuiz() {
    if (!run.log.length) { run = null; render(); return; }
    run.finished = true; render();
  }

  // ---------- results ----------
  function renderResults() {
    const total = run.log.length;
    const pct = total ? Math.round(run.right / total * 100) : 0;
    const missed = run.log.filter((l) => l.picked !== l.item.answer);
    const hints = run.log.filter((l) => l.item.hintUsed).length;

    const byTopic = {};
    run.log.forEach((l) => {
      const t = byTopic[l.item.q.topic] || (byTopic[l.item.q.topic] = { right: 0, total: 0 });
      t.total++;
      if (l.picked === l.item.answer) t.right++;
    });

    view.replaceChildren(
      h("div", { class: "card" },
        h("div", { class: "q-prompt-label", text: "Your score" }),
        h("div", { class: "score", text: run.right + " / " + total }),
        h("p", { class: "muted", text: pct + "% correct · " + plural(hints, "question", "questions") + " with a hint" + (total < run.items.length ? " · quiz ended early" : "") }),
        Object.keys(byTopic).length > 1 ? h("div", { class: "breakdown" }, Object.keys(byTopic).map((k) =>
          h("div", {}, h("span", { text: QUIZ.topics[k].title }), h("span", { text: byTopic[k].right + " / " + byTopic[k].total })))) : null,
        h("div", { class: "row" },
          missed.length ? h("button", { type: "button", class: "btn", text: "Retry " + plural(missed.length, "missed question", "missed questions"),
            onclick: () => startRun(shuffle(missed.map((l) => l.item.q))) }) : null,
          h("button", { type: "button", class: missed.length ? "btn ghost" : "btn", text: "New quiz", onclick: () => { run = null; render(); } }))),
      missed.length ? h("div", { class: "card" },
        h("h2", { text: "Review missed questions" }),
        missed.map((l) => h("div", { class: "miss" },
          h("span", { class: "q", text: l.item.q.text }),
          h("span", { class: "you", text: "You chose: " + l.item.choices[l.picked] }),
          h("span", { class: "ans", text: "Answer: " + l.item.choices[l.item.answer] }),
          l.item.q.explanation ? h("span", { class: "why", text: l.item.q.explanation }) : null,
          l.item.q.hint ? h("span", { class: "hinted", text: "Hint: " + l.item.q.hint }) : null))) : null);
    window.scrollTo(0, 0);
  }

  // ---------- routing + keys ----------
  function render() {
    if (!run) renderSetup();
    else if (run.finished) renderResults();
    else renderQuestion();
  }

  document.addEventListener("keydown", (e) => {
    if (!run || run.finished || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
    const k = e.key.toLowerCase();
    if (run.answered) {
      if (k === "n" || k === "arrowright") { e.preventDefault(); next(); }
      return;
    }
    const item = run.items[run.i];
    let i = LETTERS.toLowerCase().indexOf(k);
    if (i < 0 && /^[1-6]$/.test(k)) i = Number(k) - 1;
    if (i >= 0 && i < item.choices.length) { e.preventDefault(); choose(i); }
    else if (k === "h" && item.q.hint) { e.preventDefault(); toggleHint(); }
  });

  // ---------- go ----------
  loadQuiz().then((q) => {
    QUIZ = q;
    prefs = loadPrefs();
    buildShell();
    render();
  }).catch((err) => {
    root.replaceChildren(
      h("nav", { class: "crumbs", "aria-label": "Breadcrumb" }, h("a", { href: "./", text: "All classes" })),
      h("div", { class: "card" }, h("h2", { text: "Couldn't load this quiz" }),
        h("p", { class: "warn", style: "white-space:pre-wrap", text: err.message }),
        h("p", { class: "muted", text: "If you opened this page straight from a file, run a local web server instead (see the README)." })));
  });
})();
