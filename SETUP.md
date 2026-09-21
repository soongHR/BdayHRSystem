# Setting it up for real

Demo mode needs nothing. Going live needs a Firebase project, Microsoft
sign-in, and the security rules. Budget an hour, and about ten minutes of
someone with Azure admin rights.

---

## Before you start

**Two things worth settling first.**

This puts employee names, birthdays and dietary notes — allergies included —
into a Google Cloud project. Under the PDPA that's personal data and arguably
health data. Whoever owns data protection at Crestar should know about it. Much
easier to ask now than to unwind later.

And a GitHub Pages site is public to anyone with the link. Private repo,
public site — they're separate things, and access-controlled Pages needs GitHub
Enterprise Cloud. The page is safe to publish only because nothing renders
until you sign in and the rules gate the data. That makes step 4 non-optional.

If either is a problem, a SharePoint List with a Power App keeps everything
inside your Microsoft tenant and skips all of this.

---

## 1. Firebase project

1. <https://console.firebase.google.com> → **Add project**. Name it something
   like `crestar-birthdays`. Google Analytics: off.
2. **Build → Firestore Database → Create database**.
   - **Start in production mode.** Not test mode — test mode is open to the
     internet and expires after 30 days, locking everyone out.
   - Location: **asia-southeast1 (Singapore)**. This can't be changed later,
     and it's the one that keeps the data in country.
3. **Project settings → Your apps → Web (`</>`)**. Register the app. Copy the
   `firebaseConfig` block it shows you.

## 2. Microsoft sign-in

This is the part needing Azure admin.

1. Azure Portal → **Microsoft Entra ID → App registrations → New registration**.
   - Redirect URI, type **Web**: `https://<your-project>.firebaseapp.com/__/auth/handler`
   - Copy the **Application (client) ID** and the **Directory (tenant) ID**.
2. **Certificates & secrets → New client secret.** Copy the value now; it's
   never shown again.
3. Back in Firebase: **Authentication → Sign-in method → Microsoft**. Enable
   it, paste the client ID and secret, save.
4. **Authentication → Settings → Authorized domains.** Add your GitHub Pages
   host, e.g. `crestar.github.io`.

Prefer Google sign-in? Enable Google instead and set `authProvider: "google"`
in `app/config.js`.

## 3. Fill in `app/config.js`

```js
window.BDAY_CONFIG = {
  firebase: { /* paste the config block from step 1.3 */ },
  authProvider: "microsoft",
  microsoftTenant: "<Directory (tenant) ID from step 2.1>",
  allowedEmailDomain: "crestar.com.sg",
  organisers: ["wangseng@crestar.com.sg"]
};
```

`organisers` decides who sees the Claims tab tools and the delete buttons.

These values are public. They are supposed to be. A Firebase web config is not
a credential — it just says which project to talk to. The next step is what
actually protects anything.

## 4. Deploy the rules — do not skip this

`firestore.rules` in this repo restricts everything to verified
`@crestar.com.sg` accounts, keeps the claim to organisers only, and lets people
edit their own order and delete their own wish.

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # pick your project
firebase deploy --only firestore:rules
```

Or paste the file into **Firestore → Rules** in the console and Publish.

The organiser list appears in two places — `app/config.js` and
`firestore.rules`. The config one decides what the page *shows*; the rules one
decides what the server *allows*. Update both.

**Check it worked.** Open the page in a private window without signing in. You
should get the sign-in card and no data. If you can see names, stop and fix the
rules before sharing the link.

## 5. Publish

```bash
git init
git add .
git commit -m "Birthday celebration page"
git branch -M main
git remote add origin https://github.com/<org>/<repo>.git
git push -u origin main
```

Then **Settings → Pages → Source: GitHub Actions**. The workflow in
`.github/workflows/` does the rest on every push.

Or skip Pages and use Firebase Hosting, which keeps everything in one place:

```bash
firebase deploy --only hosting
```

## 6. First run

Sign in, then **Set up**:

- Celebration details — date, time, venue, budget per head (**7**), when orders
  close, vendor, the GrabFood outlet link, delivery fee.
- Birthday roster — paste it in as `Name, 14 Mar`, one per line.
- Menu — **☕ Load Ya Kun's GrabFood menu**, or import a fresh capture.

Then share the link.

---

## Cost

Comfortably inside the Firebase free tier. A department of thirty ordering once
a month is a few hundred reads and writes against daily limits of 50,000 and
20,000. No card needed, and unlike some free tiers the project doesn't pause
when it's quiet.

## When something's wrong

**Stuck on the sign-in card.** Your Pages host isn't in Firebase →
Authentication → Settings → Authorized domains.

**"Missing or insufficient permissions" in the console.** Rules aren't
deployed, or your email isn't verified, or it isn't on the allowed domain.

**Signed in but nothing saves.** You're outside the organiser list for a thing
only organisers may write — the claim, the roster, the settings.

**Yellow "Demo mode" badge.** `projectId` in `app/config.js` is still empty.

**Popup blocked.** Sign-in uses a popup. Allow it for your Pages domain.
