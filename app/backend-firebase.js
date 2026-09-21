/* Firebase backend — Firestore for the data, Firebase Auth for who you are.
 *
 * Loads only when app/config.js carries a real projectId. It presents exactly
 * the shape the page already speaks (doc / collection / set / update / delete /
 * add / onSnapshot), so the page itself needed no changes to move here.
 *
 * The values in config.js are public by design; a Firebase web config is not a
 * secret. What keeps staff data private is firestore.rules — read SETUP.md
 * before you let anyone loose on this.
 */
(function () {
  "use strict";

  var cfg = window.BDAY_CONFIG || {};
  if (!cfg.firebase || !cfg.firebase.projectId) return;   // stay out of the way

  var SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

  window.__BDAY_BACKEND_FIREBASE = (async function () {
    var appMod  = await import(SDK + "firebase-app.js");
    var fsMod   = await import(SDK + "firebase-firestore.js");
    var authMod = await import(SDK + "firebase-auth.js");

    var app  = appMod.initializeApp(cfg.firebase);
    var fs   = fsMod.getFirestore(app);
    var auth = authMod.getAuth(app);

    /* ---- sign in ------------------------------------------------------- */
    var provider;
    if (cfg.authProvider === "google") {
      provider = new authMod.GoogleAuthProvider();
    } else {
      provider = new authMod.OAuthProvider("microsoft.com");
      if (cfg.microsoftTenant) provider.setCustomParameters({ tenant: cfg.microsoftTenant });
    }

    function domainOk(email) {
      var allow = cfg.allowedEmailDomain;
      if (!allow) return true;
      return String(email || "").toLowerCase().endsWith("@" + String(allow).toLowerCase());
    }

    var user = await new Promise(function (resolve) {
      var done = false;
      authMod.onAuthStateChanged(auth, function (u) {
        if (done) return;
        done = true;
        resolve(u || null);
      });
    });

    if (!user) {
      showSignIn();
      return null;                       // page renders its offline notice
    }
    if (!domainOk(user.email)) {
      await authMod.signOut(auth);
      showSignIn("That account isn't on the " + cfg.allowedEmailDomain +
                 " domain. Sign in with your work email.");
      return null;
    }

    /* A tiny public profile so other people's names can be shown next to
       their orders and wishes. Only the name — never the email. */
    try {
      await fsMod.setDoc(
        fsMod.doc(fs, "profiles", user.uid),
        { name: user.displayName || "", updatedAt: Date.now() },
        { merge: true }
      );
    } catch (e) { /* rules may forbid it; the page copes without */ }

    function showSignIn(msg) {
      var wrap = document.createElement("div");
      wrap.style.cssText =
        "position:fixed;inset:0;z-index:9999;display:grid;place-items:center;" +
        "background:#faf7f5;font:15px/1.5 system-ui,sans-serif;padding:24px;text-align:center";
      var card = document.createElement("div");
      card.style.cssText =
        "max-width:420px;background:#fff;border:1px solid #e7e1dc;border-radius:16px;" +
        "padding:28px;box-shadow:0 10px 30px rgba(36,27,46,.10)";
      var h = document.createElement("h1");
      h.textContent = "Birthday Celebration";
      h.style.cssText = "margin:0 0 6px;font-size:22px";
      var p = document.createElement("p");
      p.textContent = msg || "Sign in with your work account to see this month's celebration and put your order in.";
      p.style.cssText = "margin:0 0 18px;color:#6b6259";
      var btn = document.createElement("button");
      btn.textContent = "Sign in";
      btn.style.cssText =
        "border:0;border-radius:999px;background:#d62f73;color:#fff;font:600 15px system-ui;" +
        "padding:11px 26px;cursor:pointer";
      btn.onclick = function () {
        btn.disabled = true; btn.textContent = "Opening…";
        authMod.signInWithPopup(auth, provider).catch(function (err) {
          btn.disabled = false; btn.textContent = "Sign in";
          p.textContent = "Couldn't sign in: " + (err && err.code ? err.code : "unknown error");
        });
      };
      card.appendChild(h); card.appendChild(p); card.appendChild(btn);
      wrap.appendChild(card);
      document.body.appendChild(wrap);
    }

    /* ---- the shape the page speaks ------------------------------------- */
    function refFor(path) {
      var parts = path.split("/").filter(Boolean);
      return fsMod.doc.apply(null, [fs].concat(parts));
    }
    function collFor(path) {
      var parts = path.split("/").filter(Boolean);
      return fsMod.collection.apply(null, [fs].concat(parts));
    }

    var db = {
      doc: function (path) {
        var ref = refFor(path);
        return {
          set: function (data) { return fsMod.setDoc(ref, clean(data)); },
          update: function (patch) { return fsMod.setDoc(ref, clean(patch), { merge: true }); },
          delete: function () { return fsMod.deleteDoc(ref); },
          onSnapshot: function (cb, err) {
            return fsMod.onSnapshot(ref, function (snap) {
              cb({ exists: snap.exists(), id: snap.id, data: function () { return snap.data(); } });
            }, err || function () {});
          }
        };
      },
      collection: function (path) {
        var ref = collFor(path);
        return {
          doc: function (id) { return db.doc(path + "/" + id); },
          add: function (data) { return fsMod.addDoc(ref, clean(data)); },
          onSnapshot: function (cb, err) {
            return fsMod.onSnapshot(ref, function (q) {
              cb({ docs: q.docs.map(function (d) {
                return { id: d.id, data: function () { return d.data(); } };
              }) });
            }, err || function () {});
          }
        };
      }
    };

    /* Firestore rejects undefined; the page sometimes carries it. */
    function clean(o) {
      return JSON.parse(JSON.stringify(o, function (k, v) {
        return v === undefined ? null : v;
      }));
    }

    var admins = (cfg.organisers || []).map(function (e) { return String(e).toLowerCase(); });
    var isAdmin = !admins.length || admins.indexOf(String(user.email || "").toLowerCase()) >= 0;

    var profileCache = {};
    var userApi = {
      me: function () {
        return Promise.resolve({
          id: user.uid,
          name: user.displayName || (user.email || "").split("@")[0] || "",
          avatarUrl: user.photoURL || "",
          email: user.email || "",
          canEdit: isAdmin,
          isOwner: isAdmin
        });
      },
      profiles: function (ids) {
        ids = (ids || []).filter(Boolean);
        var need = ids.filter(function (id) { return !(id in profileCache); });
        if (!need.length) return Promise.resolve(pick(ids));
        return Promise.all(need.map(function (id) {
          return fsMod.getDoc(fsMod.doc(fs, "profiles", id))
            .then(function (s) {
              profileCache[id] = {
                id: id,
                name: s.exists() ? (s.data().name || "") : "",
                avatarUrl: "", email: null,
                isMe: id === user.uid
              };
            })
            .catch(function () { profileCache[id] = { id: id, name: "", avatarUrl: "", email: null, isMe: false }; });
        })).then(function () { return pick(ids); });
      }
    };
    function pick(ids) {
      var out = {};
      ids.forEach(function (id) { if (profileCache[id]) out[id] = profileCache[id]; });
      return out;
    }

    return { label: cfg.firebase.projectId, db: db, user: userApi, signOut: function () { return authMod.signOut(auth); } };
  })();
})();
