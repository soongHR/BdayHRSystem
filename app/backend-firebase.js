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
    var mode = cfg.authProvider || "microsoft";     // open | email | microsoft | google
    var provider = null;
    if (mode === "google") {
      provider = new authMod.GoogleAuthProvider();
    } else if (mode === "microsoft") {
      provider = new authMod.OAuthProvider("microsoft.com");
      if (cfg.microsoftTenant) provider.setCustomParameters({ tenant: cfg.microsoftTenant });
    }

    /* Email-link sign-in: they arrive back here with the link's token in the
       URL, so finish that before asking anyone to sign in again. */
    if ((mode === "email" || mode === "open") && authMod.isSignInWithEmailLink(auth, window.location.href)) {
      var saved = "";
      try { saved = window.localStorage.getItem("bdayEmailForSignIn") || ""; } catch (e) {}
      if (!saved) saved = window.prompt("Confirm the work email you asked the link to be sent to:") || "";
      if (saved) {
        try {
          await authMod.signInWithEmailLink(auth, saved, window.location.href);
          try { window.localStorage.removeItem("bdayEmailForSignIn"); } catch (e) {}
          history.replaceState(null, "", window.location.pathname);
        } catch (e) {
          console.error("[birthday] email link sign-in failed:", e);
        }
      }
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

    if (mode === "open") {
      /* Nobody is asked for anything. Everyone gets a silent anonymous
         account, which is what lets the rules say "you may edit your own
         order and nobody else's". The organiser signs in properly, by a
         small link in the corner, to unlock the claim and the settings. */
      if (!user) {
        try {
          user = (await authMod.signInAnonymously(auth)).user;
        } catch (e) {
          console.error("[birthday] anonymous sign-in failed — is it enabled in Firebase?", e);
          return null;
        }
      }
      organiserLink();
    } else {
      if (!user) { showSignIn(); return null; }
      if (!domainOk(user.email)) {
        await authMod.signOut(auth);
        showSignIn("That account isn't on the " + cfg.allowedEmailDomain +
                   " domain. Sign in with your work email.");
        return null;
      }
    }

    /* Starting the organiser sign-in is wanted in two places — the corner
       button and the notice inside Set up — so it lives on window and both
       call the same thing. */
    function startOrganiserSignIn() {
      var addr = prompt("Organiser sign-in\n\nYour work email — a one-click link will be sent to it:",
                        (cfg.organisers && cfg.organisers[0]) || "");
      if (!addr) return;
      addr = addr.trim();
      if (!domainOk(addr)) { alert("Use your " + cfg.allowedEmailDomain + " address."); return; }
      authMod.sendSignInLinkToEmail(auth, addr, {
        url: location.href.split("?")[0].split("#")[0],
        handleCodeInApp: true
      }).then(function () {
        try { localStorage.setItem("bdayEmailForSignIn", addr); } catch (e) {}
        alert("Link sent to " + addr + ".\n\nOpen it in THIS browser on THIS device — that's what signs you in." +
              "\nIt can take a minute, and it often lands in Junk or Clutter the first time.");
      }).catch(function (err) {
        var c = (err && err.code) || "unknown error";
        alert("Couldn't send it: " + c +
              (/unauthorized-continue-uri|invalid-continue-uri/.test(c)
                ? "\n\nThis site's address isn't on Firebase's authorised list yet." : ""));
      });
    }
    window.__bdayOrganiserSignIn = startOrganiserSignIn;

    /* A quiet corner link, only of interest to whoever runs the celebration. */
    function organiserLink() {
      function add() {
        var a = document.createElement("button");
        var signedIn = user && !user.isAnonymous;
        a.textContent = signedIn ? "Organiser: " + (user.email || "signed in") : "Organiser sign-in";
        a.style.cssText =
          "position:fixed;right:10px;bottom:10px;z-index:80;font:11px system-ui;padding:4px 10px;" +
          "border-radius:999px;border:1px solid rgba(128,120,140,.35);background:transparent;" +
          "color:#8a8189;opacity:.7;cursor:pointer";
        a.onclick = function () {
          if (signedIn) {
            if (confirm("Sign out of the organiser account?")) authMod.signOut(auth).then(function () { location.reload(); });
            return;
          }
          startOrganiserSignIn();
        };
        document.body.appendChild(a);
      }
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add);
      else add();
    }

    /* A tiny public profile so other people's names can be shown next to
       their orders and wishes. Only the name — never the email. */
    if (!user.isAnonymous) {
      try {
        await fsMod.setDoc(
          fsMod.doc(fs, "profiles", user.uid),
          { name: user.displayName || "", updatedAt: Date.now() },
          { merge: true }
        );
      } catch (e) { /* rules may forbid it; the page copes without */ }
    }

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
      btn.style.cssText =
        "border:0;border-radius:999px;background:#d62f73;color:#fff;font:600 15px system-ui;" +
        "padding:11px 26px;cursor:pointer";
      card.appendChild(h); card.appendChild(p);

      if (mode === "email") {
        /* No admin setup needed: prove you can open the work inbox. */
        var input = document.createElement("input");
        input.type = "email";
        input.placeholder = "you@" + (cfg.allowedEmailDomain || "company.com");
        input.autocomplete = "email";
        input.style.cssText =
          "width:100%;box-sizing:border-box;padding:11px 14px;font:15px system-ui;margin-bottom:12px;" +
          "border:1.5px solid #e0d9d3;border-radius:10px";
        btn.textContent = "Email me a sign-in link";
        btn.onclick = function () {
          var addr = input.value.trim();
          if (!domainOk(addr)) {
            p.textContent = "Use your " + cfg.allowedEmailDomain + " address.";
            return;
          }
          btn.disabled = true; btn.textContent = "Sending…";
          authMod.sendSignInLinkToEmail(auth, addr, {
            url: window.location.href.split("?")[0].split("#")[0],
            handleCodeInApp: true
          }).then(function () {
            try { window.localStorage.setItem("bdayEmailForSignIn", addr); } catch (e) {}
            input.style.display = "none";
            btn.style.display = "none";
            p.textContent = "Link sent to " + addr + ". Open it on this device — it signs you straight in. Check junk mail if it's slow.";
          }).catch(function (err) {
            btn.disabled = false; btn.textContent = "Email me a sign-in link";
            p.textContent = "Couldn't send it: " + (err && err.code ? err.code : "unknown error");
          });
        };
        input.addEventListener("keydown", function (e) { if (e.key === "Enter") btn.click(); });
        card.appendChild(input);
      } else {
        btn.textContent = "Sign in with " + (mode === "google" ? "Google" : "Microsoft");
        btn.onclick = function () {
          btn.disabled = true; btn.textContent = "Opening…";
          authMod.signInWithPopup(auth, provider).catch(function (err) {
            btn.disabled = false; btn.textContent = "Sign in";
            p.textContent = "Couldn't sign in: " + (err && err.code ? err.code : "unknown error");
          });
        };
      }
      card.appendChild(btn);
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

    /* "wang.seng" -> "Wang Seng", so an email-link account still has a name. */
    function prettyFromEmail(e) {
      var local = String(e || "").split("@")[0];
      if (!local) return "";
      return local.replace(/[._-]+/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    var admins = (cfg.organisers || []).map(function (e) { return String(e).toLowerCase(); });
    var isAdmin = !user.isAnonymous
      && (!admins.length || admins.indexOf(String(user.email || "").toLowerCase()) >= 0);

    var profileCache = {};
    var userApi = {
      me: function () {
        return Promise.resolve({
          id: user.uid,
          name: user.isAnonymous ? "" : (user.displayName || prettyFromEmail(user.email) || ""),
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

    return { label: cfg.firebase.projectId + (user.isAnonymous ? "" : " · organiser"), db: db, user: userApi, signOut: function () { return authMod.signOut(auth); } };
  })();
})();
