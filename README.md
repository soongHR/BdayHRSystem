# Birthday Celebration

The monthly department birthday page — people put their food and drink order in,
pin a wish for whoever's celebrating, and the organiser gets the GrabFood basket
and the Yeeflow claim written for them.

Built for Crestar Education Group HR. Ordering from **Ya Kun Kaya Toast,
Parkway Parade**.

---

## What it does

**For everyone**

- **Celebrate** — name, coming or not, food, drink. Under a minute. Pick a Value
  Set Meal and it asks which hot drink comes inside the set, because that's how
  GrabFood sells it.
- **Wishes wall** — sticky notes for the birthday stars, with stickers and
  reactions, and a full-screen showcase for the meeting-room display.
- **The Spread** — live tally of what's been ordered.
- **Why Ya Kun?** — a kopi decoder and a short quiz, for the people who've never
  been sure what Kopi-C actually is.

**For the organiser**

- **Order Sheet** — the whole order collapsed into a GrabFood basket, one line
  per thing you add to the cart, with the running total and a copy button per
  line.
- **Claims** — the receipt, the $7-a-head budget check, and every field the
  Yeeflow eClaim form asks for, in Yeeflow's order, with a Copy button each.
- **Set up** — menu, roster, budget, brands and cost centres.

## The claim rule

Spend under `$7 × people attending` and you claim the receipt in full. Spend
over and you claim the budget, not the receipt. GST is pro-rated to match, so
Amount + GST always foots exactly to the claimed total.

Change the rate under **Set up → Budget per head**.

---

## Running it

Open `index.html`. That's the whole thing — there is no build step.

Out of the box it runs in **demo mode**: everything saves in whichever browser
is looking at it, nothing is shared, and a yellow badge in the corner says so.
Good for clicking around; useless for a real celebration.

To make it real, set up Firebase — **[SETUP.md](SETUP.md)** walks through it.

## What's in here

```
index.html                  the page — all of it
app/config.js               ← the only file you edit to go live
app/claude-shim.js          hands the page its storage API
app/backend-firebase.js     Firestore + Microsoft sign-in
app/backend-local.js        localStorage, for demo mode
firestore.rules             the security. read SETUP.md before sharing a link
firebase.json               rules + optional Firebase Hosting
tools/grabfood-menu-capture.js   pulls the live menu off a GrabFood page
.github/workflows/          publishes to GitHub Pages on push to main
```

## Refreshing the menu

Ya Kun change prices. To re-pull them:

1. Open the outlet page on GrabFood, signed in, with the delivery address set.
2. Scroll to the bottom once so every category renders.
3. F12 → Console → paste `tools/grabfood-menu-capture.js` → Enter.
4. It downloads a text file. On the page: **Set up → Import a menu straight from
   GrabFood** → paste → **Split it into the menus** → **Save settings**.

Anything named `Set …` is treated as a set meal automatically.

## A word on where this is published

A GitHub Pages site is **public to anyone with the URL** unless your
organisation is on GitHub Enterprise Cloud — a private repo does not make the
site private. That's fine here only because the page shows nothing until you
sign in and the data sits behind Firestore rules. Get those rules right before
you share the link. See SETUP.md.
