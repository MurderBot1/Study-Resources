/*
 * Small typo-tolerant fuzzy search used by the flashcard quiz mode.
 *
 *   var idx = Fuzzy.index(items, function (item) { return item.text; });
 *   Fuzzy.search(idx, "dred scot", 8)  // -> [{ item, score, ranges: [[start, end], ...] }, ...]
 *
 * Matching is case-, accent- and punctuation-insensitive. In order of preference a query matches
 * as: a contiguous substring, a set of word prefixes / contained words / near-miss words
 * (edit distance), or finally a tight in-order run of letters. `ranges` index into the ORIGINAL
 * text so the UI can highlight what matched.
 */
(function (root) {
  "use strict";

  // Lowercase, strip accents, turn anything that isn't a letter/digit into a space and collapse
  // runs of spaces. `map[i]` is the index in the original text of normalized char i.
  function normalize(text) {
    var out = "";
    var map = [];
    var lastSpace = true;
    for (var i = 0; i < text.length; i++) {
      var c = text[i].normalize("NFD").charAt(0).toLowerCase();
      if (/[a-z0-9]/.test(c)) {
        out += c; map.push(i); lastSpace = false;
      } else if (!lastSpace) {
        out += " "; map.push(i); lastSpace = true;
      }
    }
    if (out.charAt(out.length - 1) === " ") { out = out.slice(0, -1); map.pop(); }
    return { text: out, map: map };
  }

  function tokenize(norm) {
    var tokens = [];
    var re = /\S+/g, m;
    while ((m = re.exec(norm)) !== null) tokens.push({ text: m[0], start: m.index });
    return tokens;
  }

  // Optimal string alignment distance (insert / delete / substitute / adjacent swap).
  function distance(a, b) {
    var n = a.length, m = b.length, i, j, cost;
    var d = [];
    for (i = 0; i <= n; i++) { d[i] = [i]; }
    for (j = 0; j <= m; j++) { d[0][j] = j; }
    for (i = 1; i <= n; i++) {
      for (j = 1; j <= m; j++) {
        cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[n][m];
  }

  function allowedTypos(len) { return len <= 3 ? 0 : len <= 6 ? 1 : 2; }

  function index(items, getText) {
    return items.map(function (item) {
      var norm = normalize(String(getText(item)));
      return { item: item, norm: norm.text, map: norm.map, tokens: tokenize(norm.text) };
    });
  }

  // Convert [start,end) ranges in normalized text to ranges in the original text.
  function toOriginal(entry, ranges) {
    return ranges.map(function (r) {
      var s = entry.map[r[0]];
      var e = entry.map[Math.min(r[1], entry.map.length) - 1] + 1;
      return [s, e];
    });
  }

  function mergeRanges(ranges) {
    var sorted = ranges.slice().sort(function (a, b) { return a[0] - b[0]; });
    var out = [];
    sorted.forEach(function (r) {
      var last = out[out.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else out.push([r[0], r[1]]);
    });
    return out;
  }

  // 1) the whole query appears as a contiguous substring
  function substringMatch(entry, q) {
    var at = entry.norm.indexOf(q);
    if (at < 0) return null;
    var wordStart = at === 0 || entry.norm.charAt(at - 1) === " ";
    var score = 1000 + (at === 0 ? 200 : 0) + (wordStart ? 100 : 0) - at * 0.5 - (entry.norm.length - q.length) * 0.2;
    return { score: score, ranges: [[at, at + q.length]] };
  }

  // 2) every query word matches some word of the text (prefix, contained, or within a few typos)
  function tokenMatch(entry, qTokens) {
    var total = 0, ranges = [], used = {}, lastPos = -1, ordered = true;
    for (var i = 0; i < qTokens.length; i++) {
      var qt = qTokens[i].text, best = null;
      for (var j = 0; j < entry.tokens.length; j++) {
        var tt = entry.tokens[j], s = 0, len = 0;
        if (tt.text === qt) { s = 120; len = qt.length; }
        else if (tt.text.indexOf(qt) === 0) { s = 100; len = qt.length; }
        else if (qt.length >= 3 && tt.text.indexOf(qt) > 0) { s = 55; len = qt.length; }
        else if (qt.length >= 4) {
          var allowed = allowedTypos(qt.length);
          var d = Math.min(
            distance(qt, tt.text),
            distance(qt, tt.text.slice(0, qt.length)),
            distance(qt, tt.text.slice(0, qt.length + 1)),
            distance(qt, tt.text.slice(0, Math.max(1, qt.length - 1)))
          );
          if (d <= allowed) { s = 80 - d * 20; len = Math.min(tt.text.length, qt.length); }
        }
        if (used[j]) s -= 30;
        if (s > 0 && (!best || s > best.s)) {
          var off = tt.text.indexOf(qt);
          best = { s: s, j: j, start: tt.start + (s === 55 ? off : 0), len: len };
        }
      }
      if (!best) return null;
      used[best.j] = true;
      total += best.s;
      if (best.j < lastPos) ordered = false;
      lastPos = best.j;
      ranges.push([best.start, best.start + best.len]);
    }
    var score = 500 + total / qTokens.length + (ordered ? 25 : 0) - entry.norm.length * 0.05;
    return { score: score, ranges: mergeRanges(ranges) };
  }

  // 3) letters of the query occur in order, close together and starting at a word boundary
  function subsequenceMatch(entry, q) {
    var letters = q.replace(/ /g, "");
    if (letters.length < 3) return null;
    var best = null;
    for (var start = 0; start < entry.norm.length; start++) {
      if (entry.norm.charAt(start) !== letters.charAt(0)) continue;
      if (start > 0 && entry.norm.charAt(start - 1) !== " ") continue;
      var pos = start, hits = [start], ok = true;
      for (var k = 1; k < letters.length; k++) {
        var next = entry.norm.indexOf(letters.charAt(k), pos + 1);
        if (next < 0) { ok = false; break; }
        hits.push(next); pos = next;
      }
      if (!ok) continue;
      var span = pos - start + 1;
      if (span > letters.length * 2 + 4) continue;
      var score = 200 - (span - letters.length) * 4 - start * 0.1;
      if (!best || score > best.score) best = { score: score, hits: hits };
    }
    if (!best) return null;
    return { score: best.score, ranges: mergeRanges(best.hits.map(function (p) { return [p, p + 1]; })) };
  }

  function match(entry, q, qTokens) {
    var r = substringMatch(entry, q) || tokenMatch(entry, qTokens) || subsequenceMatch(entry, q);
    if (!r) return null;
    return { item: entry.item, score: r.score, ranges: toOriginal(entry, r.ranges) };
  }

  function search(idx, query, limit) {
    var nq = normalize(String(query));
    if (!nq.text) return [];
    var qTokens = tokenize(nq.text);
    var results = [];
    idx.forEach(function (entry, order) {
      var m = match(entry, nq.text, qTokens);
      if (m) { m.order = order; results.push(m); }
    });
    results.sort(function (a, b) { return b.score - a.score || a.order - b.order; });
    return limit ? results.slice(0, limit) : results;
  }

  var Fuzzy = { normalize: normalize, index: index, search: search, distance: distance };
  if (typeof module !== "undefined" && module.exports) module.exports = Fuzzy;
  else root.Fuzzy = Fuzzy;
})(typeof window !== "undefined" ? window : this);
