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
    apiKey:            "AIzaSyBJysmJcq4CFJtxhpwAAXnKnrH6_cMSNu4",
    authDomain:        "crestar-birthdays.firebaseapp.com",   // e.g. crestar-birthdays.firebaseapp.com
    projectId:         "crestar-birthdays",   // e.g. crestar-birthdays
    storageBucket:     "crestar-birthdays.firebasestorage.app",
    messagingSenderId: "238954213999",
    appId:             "1:238954213999:web:084021da6acfe1bb44539a"
  },

  // How people sign in. Pick one:
  //   "open"      — nobody is asked to sign in. Staff are signed in silently
  //                 and anonymously; the organiser uses the corner link.
  //                 Needs Anonymous AND Email link enabled in Firebase.
  //   "email"     — everyone gets a one-click sign-in link by email.
  //   "microsoft" — same login as Outlook. Needs an Azure app registration,
  //                 so someone with admin rights has to help once.
  //   "google"    — only if staff have Google accounts.
  authProvider: "open",

  // Only for authProvider "microsoft". Azure AD tenant ID; locks sign-in to
  // Crestar accounts. Leave "" to allow any Microsoft account on the domain.
  microsoftTenant: "",

  // Nobody outside this email domain gets in. Belt and braces with the rules.
  allowedEmailDomain: "crestar.com.sg",

  // Who sees the organiser tools. Empty list = everyone signed in can.
  organisers: [
    "wangseng@crestar.com.sg"
  ]
};
