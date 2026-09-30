// Loads content.txt and fills in the page. See content.txt itself for
// the editing rules (emphasis syntax, adding list items, etc).
//
// NOTE: fetch() can't read local files when a page is opened directly
// via double-click (a file:// URL) — browsers block that for security.
// Run a local server to preview changes, e.g. from this folder:
//   python3 -m http.server 8000
// then open http://localhost:8000/ in a browser.

(function () {
  // ---- parse content.txt into flat key/value pairs -----------------
  function parseContent(text) {
    var data = {};
    text.split("\n").forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed || trimmed.charAt(0) === "#") return;
      var match = trimmed.match(/^\[([A-Za-z0-9_.]+)\]\s?(.*)$/);
      if (match) data[match[1]] = match[2];
    });
    return data;
  }

  // ---- group keys like "faq.1.q" / "faq.1.a" into ------------------
  // { faq: [ {q: "...", a: "..."}, {q: "...", a: "..."} ] }
  // List order follows the number in the key, not the order in the file.
  function groupRepeats(data) {
    var groups = {};
    Object.keys(data).forEach(function (key) {
      var m = key.match(/^(.+)\.(\d+)\.([A-Za-z0-9_]+)$/);
      if (!m) return;
      var group = m[1], index = parseInt(m[2], 10), field = m[3];
      if (!groups[group]) groups[group] = [];
      if (!groups[group][index]) groups[group][index] = {};
      groups[group][index][field] = data[key];
    });
    // compact away the empty slot at index 0 if numbering starts at 1
    Object.keys(groups).forEach(function (g) {
      groups[g] = groups[g].filter(function (item) { return item; });
    });
    return groups;
  }

  // ---- turn "some *emphasized* text" into safe HTML -----------------
  // Anything in the content file is treated as plain text EXCEPT a
  // pair of *asterisks*, which becomes an italic/highlighted <em>.
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function renderInline(value) {
    var escaped = escapeHtml(value);
    return escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  // ---- apply data-k / data-k-href / data-k-alt / data-k-src ----------
  // to `root` (the whole document, or a single cloned list item),
  // looking values up through `lookup(fieldName)`.
  function applyIn(root, lookup) {
    root.querySelectorAll("[data-k]").forEach(function (el) {
      var value = lookup(el.getAttribute("data-k"));
      if (value !== undefined) el.innerHTML = renderInline(value);
    });
    root.querySelectorAll("[data-k-href]").forEach(function (el) {
      var value = lookup(el.getAttribute("data-k-href"));
      if (value !== undefined) el.setAttribute("href", value);
    });
    root.querySelectorAll("[data-k-alt]").forEach(function (el) {
      var value = lookup(el.getAttribute("data-k-alt"));
      if (value !== undefined) el.setAttribute("alt", value);
    });
    root.querySelectorAll("[data-k-src]").forEach(function (el) {
      var value = lookup(el.getAttribute("data-k-src"));
      if (value !== undefined) el.setAttribute("src", value);
    });
  }

  // ---- stamp out one clone of a <template data-repeat="group"> ------
  // per item found for that group, in order, right before the template.
  function applyRepeats(groups) {
    document.querySelectorAll("template[data-repeat]").forEach(function (tpl) {
      var items = groups[tpl.getAttribute("data-repeat")] || [];
      items.forEach(function (item) {
        var clone = tpl.content.cloneNode(true);
        applyIn(clone, function (field) { return item[field]; });
        tpl.parentNode.insertBefore(clone, tpl);
      });
    });
  }

  function applyContent(data) {
    if (data["meta.title"]) document.title = data["meta.title"];
    var descTag = document.querySelector('meta[name="description"]');
    if (descTag && data["meta.description"]) {
      descTag.setAttribute("content", data["meta.description"]);
    }
    applyIn(document, function (key) { return data[key]; });
    applyRepeats(groupRepeats(data));
  }

  fetch("content.txt", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("content.txt returned " + res.status);
      return res.text();
    })
    .then(function (text) {
      applyContent(parseContent(text));
    })
    .catch(function (err) {
      console.warn(
        "[content-loader] Couldn't load content.txt — the page text will be blank.\n" +
        "If you opened this file directly (file://...), that's why: browsers block " +
        "local pages from reading local files. Run a local server instead, e.g.:\n" +
        "  python3 -m http.server 8000\n" +
        "then visit http://localhost:8000/\n" +
        "Original error:", err
      );
    });
})();
