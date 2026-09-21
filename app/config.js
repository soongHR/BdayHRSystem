/* ---------------------------------------------------------------------------
 * Fill this in to go live. Until you do, the page runs in demo mode and saves
 * only in whoever's browser is looking at it.
 *
 * These values are NOT secret — a Firebase web config is public by design and
 * is visible to anyone who views source. What protects staff data is
 * firestore.rules. Read SETUP.md before sharing the link.
 * ------------------------------------------------------------------------- */
window.BDAY_CONFIG = {

  // From Firebase console -> Project settings -> Your apps -> Web app
  firebase: {
    apiKey:            "",
    authDomain:        "",   // e.g. crestar-birthdays.firebaseapp.com
    projectId:         "",   // e.g. crestar-birthdays
    storageBucket:     "",
    messagingSenderId: "",
    appId:             ""
  },

  // "microsoft" for Microsoft 365 sign-in, or "google"
  authProvider: "microsoft",

  // Azure AD tenant ID — locks sign-in to Crestar accounts. Leave "" for any.
  microsoftTenant: "",

  // Nobody outside this email domain gets in. Belt and braces with the rules.
  allowedEmailDomain: "crestar.com.sg",

  // Who sees the organiser tools. Empty list = everyone signed in can.
  organisers: [
    "wangseng@crestar.com.sg"
  ]
};
