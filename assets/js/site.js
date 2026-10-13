/* Renders the home page and class pages from window.CATALOG (assets/js/catalog.js). */
(function () {
  "use strict";
  var catalog = window.CATALOG || { classes: [] };
  var body = document.body;
  var page = body.getAttribute("data-page");
  var root = body.getAttribute("data-root") || "";

  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  function tile(href, title, description, meta) {
    return h("a", { "class": "tile", href: href }, [
      h("h3", { text: title }),
      description ? h("p", { text: description }) : null,
      meta ? h("p", { "class": "meta", text: meta }) : null
    ]);
  }

  function section(title, items, hrefPrefix) {
    var grid = h("div", { "class": "grid" });
    if (!items.length) {
      grid.appendChild(h("p", { "class": "empty", text: "Nothing here yet." }));
    }
    items.forEach(function (it) {
      grid.appendChild(tile(hrefPrefix + it.href, it.title, it.description, it.meta));
    });
    return h("section", { "class": "section" }, [
      h("h2", {}, [document.createTextNode(title), h("small", { text: String(items.length) })]),
      grid
    ]);
  }

  var mount = document.getElementById("app");
  if (!mount) return;

  if (page === "home") {
    catalog.classes.forEach(function (c) {
      var meta = plural(c.quizzes.length, "quiz", "quizzes") + " · " +
        plural(c.flashcards.length, "flashcard deck", "flashcard decks");
      mount.appendChild(tile(root + "classes/" + c.id + "/", c.title, c.subtitle, meta));
    });
  } else if (page === "class") {
    var id = body.getAttribute("data-class");
    var cls = catalog.classes.filter(function (c) { return c.id === id; })[0];
    if (!cls) {
      mount.appendChild(h("p", { "class": "empty", text: "Class not found." }));
    } else {
      mount.appendChild(section("Quizzes", cls.quizzes, ""));
      mount.appendChild(section("Flashcards", cls.flashcards, ""));
    }
  }
})();
