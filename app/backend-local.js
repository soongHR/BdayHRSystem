/* Local backend — everything lives in this browser's localStorage.
 *
 * It exists so the page works the moment it is served: push to GitHub Pages,
 * open it, and you can click through the whole thing. Nothing is shared
 * between people and nothing survives clearing site data, so it is for trying
 * the page out, not for running a real celebration. Configure Firebase in
 * app/config.js and this steps aside.
 */
(function () {
  "use strict";

  var KEY = "bday_local_v1";
  var store = read();
  var listeners = [];

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
    /* Other tabs get the storage event; this one has to be told. */
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
  }
  window.addEventListener("storage", function (e) {
    if (e.key !== KEY) return;
    store = read();
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
  });

  /* Paths alternate collection/document: "events/2026-09/rsvps/abc". */
  function docSnap(path) {
    var d = store[path];
    return {
      exists: !!d,
      id: path.split("/").pop(),
      data: function () { return d ? JSON.parse(JSON.stringify(d)) : undefined; }
    };
  }
  function childrenOf(coll) {
    var prefix = coll + "/";
    return Object.keys(store)
      .filter(function (p) {
        return p.indexOf(prefix) === 0 && p.slice(prefix.length).indexOf("/") < 0;
      })
      .sort()
      .map(function (p) { return docSnap(p); });
  }

  function onChange(fn) {
    listeners.push(fn);
    return function () {
      var i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  function docRef(path) {
    return {
      set: function (data) { store[path] = JSON.parse(JSON.stringify(data)); write(); return Promise.resolve(); },
      update: function (patch) {
        store[path] = Object.assign({}, store[path] || {}, JSON.parse(JSON.stringify(patch)));
        write(); return Promise.resolve();
      },
      delete: function () { delete store[path]; write(); return Promise.resolve(); },
      onSnapshot: function (cb) {
        var fire = function () { try { cb(docSnap(path)); } catch (e) {} };
        fire();
        return onChange(fire);
      }
    };
  }

  function collRef(coll) {
    return {
      doc: function (id) { return docRef(coll + "/" + id); },
      add: function (data) {
        var id = "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        store[coll + "/" + id] = JSON.parse(JSON.stringify(data));
        write();
        return Promise.resolve({ id: id });
      },
      onSnapshot: function (cb) {
        var fire = function () { try { cb({ docs: childrenOf(coll) }); } catch (e) {} };
        fire();
        return onChange(fire);
      }
    };
  }

  /* One made-up identity per browser, so the page has someone to be. */
  function localMe() {
    var id = null;
    try { id = localStorage.getItem("bday_local_uid"); } catch (e) {}
    if (!id) {
      id = "local_" + Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem("bday_local_uid", id); } catch (e) {}
    }
    var name = "";
    try { name = localStorage.getItem("bday_local_name") || ""; } catch (e) {}
    return { id: id, name: name, avatarUrl: "", email: "", canEdit: true, isOwner: true };
  }

  window.__BDAY_BACKEND_LOCAL = {
    label: "This browser only",
    db: { doc: docRef, collection: collRef },
    user: {
      me: function () { return Promise.resolve(localMe()); },
      profiles: function () { return Promise.resolve({}); }
    }
  };
})();
