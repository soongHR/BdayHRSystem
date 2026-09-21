/* Gives the page the `window.claude.use(...)` it expects, backed by whichever
 * backend is configured. The page itself is unchanged from the Claude version,
 * which is deliberate: one file to swap, nothing to re-test.
 *
 *   use("db")        -> Firestore, or localStorage
 *   use("user")      -> the signed-in person
 *   use("downloads") -> an ordinary browser download
 */
(function () {
  "use strict";
  if (window.claude && typeof window.claude.use === "function") return;  // running on claude.ai

  var chosen = (async function () {
    if (window.__BDAY_BACKEND_FIREBASE) {
      try {
        var fb = await window.__BDAY_BACKEND_FIREBASE;
        if (fb) return fb;
        return null;                       // signed out; the sign-in card is up
      } catch (e) {
        console.error("[birthday] Firebase failed to start:", e);
      }
    }
    return window.__BDAY_BACKEND_LOCAL || null;
  })();

  var downloads = {
    save: function (req) {
      return new Promise(function (resolve, reject) {
        try {
          var data = req && req.data;
          var blob = (data instanceof Blob) ? data : new Blob([data], { type: "text/plain;charset=utf-8" });
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = (req && req.filename) || "download.txt";
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
          resolve({ status: "saved" });
        } catch (e) {
          reject({ code: "unavailable", message: String(e) });
        }
      });
    }
  };

  window.claude = {
    use: function (name) {
      if (name === "downloads") return Promise.resolve(downloads);
      return chosen.then(function (b) {
        if (!b) return null;
        if (name === "db") return b.db;
        if (name === "user") return b.user;
        return null;
      });
    }
  };

  /* A quiet line in the corner saying where the data is going, so nobody
     mistakes the try-it-out mode for the real thing. */
  chosen.then(function (b) {
    if (!b) return;
    var tag = document.createElement("div");
    tag.textContent = b === window.__BDAY_BACKEND_LOCAL
      ? "Demo mode — saved in this browser only"
      : "Connected · " + b.label;
    tag.style.cssText =
      "position:fixed;left:10px;bottom:10px;z-index:80;font:11px system-ui;padding:4px 10px;" +
      "border-radius:999px;opacity:.6;pointer-events:none;" +
      (b === window.__BDAY_BACKEND_LOCAL ? "background:#f6de7a;color:#3a2a00" : "background:#d8f3ef;color:#0b6b60");
    document.addEventListener("DOMContentLoaded", function () { document.body.appendChild(tag); });
    if (document.readyState !== "loading") document.body.appendChild(tag);
  });
})();
