// Loads content.txt into the webpage
(function () {
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
    Object.keys(groups).forEach(function (g) {
      groups[g] = groups[g].filter(function (item) { return item; });
    });
    return groups;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  // "some *emphasized* text" -> <em>; "[link text](url)" -> <a href="url">
  function renderInline(value) {
    var html = escapeHtml(value);
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (match, text, url) {
      var external = /^https?:\/\//i.test(url);
      return '<a href="' + url + '"' + (external ? ' target="_blank" rel="noopener"' : "") + ">" + text + "</a>";
    });
    return html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

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

  function applyRepeats(groups) {
    document.querySelectorAll("template[data-repeat]").forEach(function (tpl) {
      var items = groups[tpl.getAttribute("data-repeat")];
      if (!items || !items.length) return;

      Array.prototype.slice.call(tpl.parentNode.children).forEach(function (child) {
        if (child !== tpl) child.remove();
      });

      items.forEach(function (item, i) {
        var clone = tpl.content.cloneNode(true);
        applyIn(clone, function (field) { return item[field]; });
        clone.querySelectorAll("[data-auto-index]").forEach(function (el) {
          el.textContent = String(i + 1);
        });
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
        "[content-loader] Couldn't load content.txt. \n" +
        "Original error:", err
      );
    });
})();
