---
cssclasses:
  - dashboard
---

# 🫀 Santi Pulse — Dashboard

> [!info] Welcome back
> **Today is:** `=date(today)`  ·  **Last edited:** `=this.file.mtime`
> Your personal command center. One home for websites, restaurants, stores, and the templates you sell to them.
> Browser version: [Dashboard.html](Dashboard.html) (opens in any browser, deep-links back into Obsidian)

---

## ⚡ Quick Actions

|                                🆕 New                                 |                          📅 Daily                           |                               🔎 Search                               |                          🕸 Graph                           |
| :-------------------------------------------------------------------: | :---------------------------------------------------------: | :-------------------------------------------------------------------: | :---------------------------------------------------------: |
| <a href="obsidian://new?vault=Website&name=Untitled">**New Note**</a> | <a href="obsidian://daily?vault=Website">**Daily Note**</a> | <a href="obsidian://search?vault=Website&query=">**Search Vault**</a> | <a href="obsidian://graph?vault=Website">**Open Graph**</a> |

> [!tip] Replace `Website` in the links above with your actual vault name if it's different. The links work even if you don't have the Advanced URI plugin — they use built-in Obsidian protocol.

---

## 📊 Quick Stats

> [!example] At a glance
> - 🌐 **Websites:** 4 verticals live (barber · nail · restaurant · tour)
> - 🍽️ **Restaurants:** 3 demo concepts (marisco · canario · casual)
> - 🛍️ **Stores:** placeholder — add your own
> - 📋 **Templates:** 4 production-ready Next.js apps
> - 💡 **Notes in vault:** `=length(file.outlinks) + length(file.inlinks)` linked references

```dataview
TABLE WITHOUT ID
  "📝 " + length(rows) AS "Total Notes"
FROM ""
WHERE file.name != "Dashboard"
```

---

## 🌐 Websites

> [!abstract] The web side of the business
> Live sites, deployment notes, and per-client setups. Every site is a Next.js 16 app deployed to Vercel.

|  |  |
|:---:|:---:|
| [[Tech Stack Reality\|🧱 **Tech Stack**]] | [[Deployment\|🚀 **Deployment**]] |
| What the templates actually are | Vercel + per-client checklist |
| [[Booking System Architecture\|🏗️ **Architecture**]] | [[Supabase Setup\|🗄️ **Supabase**]] |
| How a booking flows end-to-end | DB schema + RLS policies |

**See all →** [[Website Projects|📁 Open Websites folder]]

---

## 🍽️ Restaurants

> [!abstract] Restaurant clients & demo concepts
> Notes, reviews, and the demo restaurants used in the restaurant template.

|  |  |
|:---:|:---:|
| [[Restaurant Reviews\|⭐ **Reviews**]] | [[Restaurant Pitches\|📣 **Pitches**]] |
| Who I've visited, what worked | Cold emails + meeting notes |
| [[Restaurant Demo - Marisco\|🦞 **La Marea (Marisco)**]] | [[Restaurant Demo - Canario\|🌶️ **Canario**]] |
| Seafood concept · aforo 40 | Local cuisine · aforo 32 |
| [[Restaurant Demo - Casual\|🍝 **Casual**]] | [[Restaurant Leads\|📞 **Leads**]] |
| Casual dining · aforo 28 | Active prospects |

**See all →** [[Restaurants|📁 Open Restaurants folder]]

---

## 🛍️ Stores

> [!abstract] Retail clients & store notes
> Local shops, boutiques, and product-based businesses.

|  |  |
|:---:|:---:|
| [[Store Notes\|📓 **Store Notes**]] | [[Store Leads\|📞 **Leads**]] |
| Ideas, contacts, observations | Active prospects |
| [[Store Pricing\|💰 **Pricing**]] | [[Store Pitches\|📣 **Pitches**]] |
| Tier ideas for retail | Cold emails for shops |

**See all →** [[Stores|📁 Open Stores folder]]

---

## 📋 Restaurant Templates

> [!success] **The main product** — sold to restaurant clients
> Three production-ready restaurant designs (marisco, canario, casual) sharing one Next.js codebase. Booking, admin, availability, emails — all wired up.

|  |  |  |
|:---:|:---:|:---:|
| [[Restaurant Template\|📋 **Overview**]] | [[Build Tasks\|🛠️ **Build Tasks**]] | [[Booking System Architecture\|🏗️ **Architecture**]] |
| What's in the package | What's done, what's left | How bookings flow |
| [[Booking Options - Booksy vs Custom\|🔀 **Booking Modes**]] | [[Supabase Setup\|🗄️ **Database**]] | [[Deployment\|🚀 **Deploy**]] |
| Custom vs Booksy/WhatsApp | Tables + RLS + env vars | Vercel checklist |

> [!tip] Quick links into the codebase
> - Code lives in `F:\Website Templates\restaurant-templates\`
> - Three variants: `/marisco`, `/canario`, `/casual`
> - Run `npm run dev` then visit `http://localhost:3000`

**See all →** [[Restaurant Template|📁 Open Templates folder]]

---

## 🧭 Core Notes

> [!note] The original Map of Content
> [[00 - Start Here (MOC)|🗺️ Start Here (legacy MOC)]] · [[Welcome|👋 Welcome]] · [[Business Plan|💼 Business Plan]] · [[Sales & Pitches|📣 Sales]]

---

## 🕒 Recent Notes

```dataview
TABLE WITHOUT ID
  file.link AS "Note",
  dateformat(file.mtime, "yyyy-MM-dd HH:mm") AS "Modified"
FROM ""
WHERE file.name != "Dashboard"
SORT file.mtime DESC
LIMIT 8
```

> [!warning] No Dataview installed?
> The block above will show as plain text. Install **Dataview** from Community Plugins to make it live. Until then, here are manual links:
> - [[Build Tasks]]
> - [[Booking System Architecture]]
> - [[Supabase Setup]]
> - [[Deployment]]
> - [[Tech Stack Reality]]
> - [[Sales & Pitches]]
> - [[Business Plan]]
> - [[Booking Options - Booksy vs Custom]]

---

## ✅ What's Next

> [!todo] Pinned actions
> - [ ] Pitch a real restaurant in Tenerife with the live demo URL
> - [ ] Add per-restaurant `slotCapacity` review (currently 40 / 32 / 28 — sane?)
> - [ ] Rotate the Supabase keys that were pasted in chat
> - [ ] Build the Store template (no equivalent yet)
> - [ ] Wire up the "Stores" placeholder notes referenced in this dashboard

---

## 🛠️ How to use this dashboard

> [!info]- Set as homepage (click to expand)
> 1. Install the **Homepage** community plugin
>    *Settings → Community plugins → Browse → "Homepage"*
> 2. Open the plugin settings and set **Homepage** to `Dashboard`
> 3. Restart Obsidian — this note opens on startup
>
> **No-plugin alternative:** right-click `Dashboard.md` in the file explorer → **"Pin"** so it's always one click away. Or star it with `Ctrl+P → Star file`.

> [!info]- Recommended plugins (click to expand)
> - **Dataview** — powers the Recent Notes block + the stats query
> - **Homepage** — makes this note open on startup
> - **Advanced URI** — richer `obsidian://` links (optional, default protocol already works)
> - **Buttons** — if you want real buttons instead of styled links (optional)
> - **Iconize** or **Lucide Icons** — replace the emoji with proper icons (optional, purely cosmetic)

> [!info]- Customize the placeholders (click to expand)
> Wikilinks in `[[double brackets]]` that don't exist yet are shown in a different color in Obsidian — click them to create the note.
>
> **Rename suggestions:**
> - `[[Website Projects]]` → name your client folder
> - `[[Restaurant Reviews]]`, `[[Restaurant Leads]]` → split however suits you
> - `[[Restaurant Demo - Marisco/Canario/Casual]]` → one note per demo concept
> - `[[Store Notes]]`, `[[Store Leads]]`, `[[Store Pricing]]`, `[[Store Pitches]]` → fill in as you go
> - `[[Restaurant Template]]` → main spec note for the template package
>
> **Folder links** (the "See all →" rows) only work if you create folders with those names in the vault root. If you keep everything flat, just delete those lines.

> [!info]- Dataview query reference (click to expand)
> The two blocks on this page:
>
> **Total Notes:**
> ```
> TABLE WITHOUT ID "📝 " + length(rows) AS "Total Notes"
> FROM "" WHERE file.name != "Dashboard"
> ```
>
> **Recent Notes:**
> ```
> TABLE WITHOUT ID file.link AS "Note", dateformat(file.mtime, "yyyy-MM-dd HH:mm") AS "Modified"
> FROM "" WHERE file.name != "Dashboard"
> SORT file.mtime DESC LIMIT 8
> ```
>
> Swap `FROM ""` for `FROM "Restaurants"` etc. to scope a section's stats to that folder.

---

*Dashboard last updated: 2026-05-28*
