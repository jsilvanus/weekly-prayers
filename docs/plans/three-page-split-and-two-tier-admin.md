# Architectural & Implementation Plan: Three-Page Split and Two-Tier Admin

**Branch**: `feat/three-page-split-and-two-tier-admin`  
**Status**: Draft Plan & Implementation Roadmap  
**Application**: Weekly Prayers (Rukousaiheet)

---

## 1. Executive Summary & Objective

The Weekly Prayers application is being expanded from a single prayer-list-centric landing page into three distinct, dedicated primary landing pages representing the core spiritual pillars of parish life:

1. **Prayer Intentions (*Esirukoukset*)**: The central hub for parish intercessions, clergy prayers (Pastor & Bishop), ministry staff focus areas, and parishioners' community prayer requests.
2. **Bible & Word of the Day (*Raamattu & Päivän sana*)**: Scripture readings, liturgical day context (theme, color, readings), with an immediate interactive dialogue for today's verse and meditation.
3. **Moment of Prayer (*Rukoushetki / Hetkirukoukset*)**: Liturgy of the Hours (*Laudes, Seksti, Vesper, Kompletorio*) with a prominent **"Pray Now"** action that immediately opens the liturgical prayer matching the current time of day with all liturgical texts ready.

Simultaneously, the administrative interface (`/admin`) is refactored from a flat tab bar into a structured **two-tier hierarchy** divided into four functional domains:
- **Prayer Intentions** (*Esirukoukset*)
- **Bible Word** (*Raamattu & Päivän sana*)
- **Liturgy of Hours** (*Hetkirukoukset*)
- **General** (*Yleiset asetukset & hallinta*)

---

## 2. Three Main Landing Pages: Architecture & User Experience

Each of the three landing pages shares a cohesive, recognizable structure while featuring a specialized **primary action button** and **sibling navigation controls** connecting to the other two pillars.

```
+-----------------------------------------------------------------------------------+
|                                  SHARED HEADER                                    |
| [EVL Logo] [Parish Logo]  Esirukoukset | Raamattu & Päivän sana | Hetkirukous     |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [Pillar 1: Esirukoukset]     [Pillar 2: Raamattu]      [Pillar 3: Hetkirukous]   |
|  Path: / or /prayers          Path: /bible              Path: /prayer-moment      |
|                                                                                   |
|  * Primary Action:            * Primary Action:         * Primary Action:         |
|    [ ✍️ Jätä esirukouspyyntö ]   [ 📜 Näytä päivän sana ]  [ 🕊️ Rukoile nyt ]       |
|    (Opens Submission Modal)     (Opens Verse Dialog)      (Opens Current Hour)    |
|                                                                                   |
|  * Cross-Navigation:          * Cross-Navigation:       * Cross-Navigation:       |
|    [📖 Lue Raamattua]           [🙏 Esirukoukset]         [🙏 Esirukoukset]       |
|    [🕊️ Hetkirukous]             [🕊️ Hetkirukous]         [📖 Lue Raamattua]      |
|                                                                                   |
|  * Page Content:              * Page Content:           * Page Content:           |
|    - Opening Invocation         - Liturgical Day Banner   - Real-time Hour Text   |
|    - Bishop & Pastor Prayers    - Liturgical Color Pill   - Antiphons & Psalms    |
|    - Ministry Group Requests    - Daily Lectionary        - Scripture & Collect   |
|    - Public Prayer List         - Date Selector           - Hour Switcher Tabs    |
|    - Lord's Prayer & Counter    - Future Bible Tools      - Lord's Prayer         |
|                                                                                   |
+-----------------------------------------------------------------------------------+
|                                  SHARED FOOTER                                    |
+-----------------------------------------------------------------------------------+
```

### 2.1 Page 1: Prayer Intentions (`/` or `/prayers`)
- **Primary Hero Action**:
  - `[✍️ Jätä esirukouspyyntö]` (*Leave a Prayer Intention*): Triggers the existing `PrayerModal` dialog for submitting intercessions.
- **Sibling Navigation**:
  - `[📖 Lue Raamattua]` (*Read the Bible*) -> Navigates to `/bible`.
  - `[🕊️ Hiljenny hetkirukoukseen]` (*Have a Moment for Prayer*) -> Navigates to `/prayer-moment`.
- **Content Flow**:
  1. Parish identity & Yhtymä switcher (if part of parish union).
  2. Opening liturgical invocation (*Siunaus ja aloitus*).
  3. Bishop's diocesan prayer with official crest (if published).
  4. Pastor's weekly prayer and parish seal.
  5. Ministry / departmental prayer requests (*Työalojen rukoukset*).
  6. Public approved prayer requests (*Seurakuntalaisten rukousaiheet*).
  7. Lord's prayer with prayer counter (*Isä meidän & Rukouslaskuri*).
- **Changes from Legacy Home Page**:
  - `FrontPageBibleWidget` is removed from this page and integrated cleanly into Page 2 (Bible) and Page 3 (Moment of Prayer).

### 2.2 Page 2: Bible & Word of the Day (`/bible`)
- **Primary Hero Action**:
  - `[📜 Näytä päivän sana]` (*Show Me the Verse of the Day*): Opens `DailyVerseModal` — an accessible, focused modal dialog showcasing today's scripture verse, reference, liturgical context, and devotional meditation text.
- **Sibling Navigation**:
  - `[🙏 Siirry esirukouksiin]` (*Go to Prayer Intentions*) -> Navigates to `/`.
  - `[🕊️ Hiljenny hetkirukoukseen]` (*Have a Moment for Prayer*) -> Navigates to `/prayer-moment`.
- **Content Flow**:
  1. Liturgical Day Header: Season, Sunday/feast day name, theme, and liturgical color indicator with explanatory dot/badge.
  2. Date Selector: Allows parishioners to look up liturgical readings for upcoming or past dates.
  3. Daily Lectionary Readings (*Päivän lukukappaleet*):
     - First reading (OT / Acts)
     - Epistle / Psalm
     - Holy Gospel
  4. Extensibility container for future Bible features (e.g. search, translation selector KR92 / UT2020, reading plans).

### 2.3 Page 3: Moment of Prayer / Liturgy of the Hours (`/prayer-moment` or `/hetkirukous`)
- **Primary Hero Action**:
  - `[🕊️ Rukoile nyt]` (*Pray Now*): Immediately highlights and opens the prayer corresponding to the current time of day:
    - **Laudes (Aamurukous)**: 06:00 – 10:00
    - **Seksti (Päivärukous)**: 11:00 – 16:00
    - **Vesper (Iltarukous)**: 17:00 – 20:00
    - **Kompletorio (Yörukous)**: 21:00 – 05:00
  - Automatically loads and formats all relevant texts into an unbroken prayer flow:
    - Opening versicle (*"Jumala, riennä minua auttamaan..."*)
    - Antiphon & Psalmody with Gloria Patri
    - Short Scripture reading (*Lukukappale*)
    - Responsory / Meditative silence
    - Canticle (*Benedictus / Magnificat / Nunc Dimittis* according to the hour)
    - Collect prayer of the day (*Hetkirukous*)
    - Lord's Prayer & Final Blessing
- **Sibling Navigation**:
  - `[🙏 Siirry esirukouksiin]` (*Go to Prayer Intentions*) -> Navigates to `/`.
  - `[📖 Lue Raamattua]` (*Read the Bible*) -> Navigates to `/bible`.
- **Interactive Controls**:
  - Time-of-day tabs allowing manual browsing of other prayer hours.
  - Date selector for praying texts for other calendar days.

---

## 3. Two-Tier Administrative Control Panel

The administrative panel (`/admin`) is updated from a flat, horizontally scrolling list of 9 tabs to a clean two-tier navigation structure.

```
===================================================================================
ADMINISTRATIVE PANEL (/admin)
===================================================================================

[TIER 1 DOMAIN TABS]
  (🙏 Esirukoukset)  |  (📖 Raamattu & Sana)  |  (🕊️ Hetkirukoukset)  |  (⚙️ Yleiset asetukset)
-----------------------------------------------------------------------------------
[TIER 2 SUB-TABS (when Esirukoukset is active)]
  [Julkiset pyynnöt] [Työalat] [Kirkkoherra] [Piispa] [Nostot] [Kierto & Ryhmät] [Esirukouslista]
-----------------------------------------------------------------------------------

[ACTIVE VIEW CONTAINER]
  ... Component for active sub-tab ...
```

### 3.1 Tier 1 Categories & Tier 2 Sub-Views Breakdown

#### 1. Prayer Intentions (*Esirukoukset*)
- **`public` — Julkiset rukouspyynnöt (`PrayerManager`)**: Review, moderation, approval queue, AI flagged review.
- **`staff` — Työalojen rukoukset (`StaffPrayerForm`)**: Submission and management of parish ministry items.
- **`pastor` — Kirkkoherran rukous (`PastorPrayerForm`)**: Weekly pastor prayer and theme text.
- **`bishop` — Piispan rukous (`BishopPrayerForm`)**: Diocesan bishop prayer and crest configuration.
- **`highlights` — Nostot & kohokohdat (`HighlightManager`)**: Pinned highlights and priority prayers.
- **`groups-tags` — Kierto, ryhmät ja tunnisteet**: Prayer week transition day (e.g. Thursday), custom ministry groups and tags.
- **`intercession-export` — Esirukouslista**: Sunday worship prayer list export and verification.

#### 2. Bible Word (*Raamattu & Päivän sana*)
- **`daily-verse` — Päivän sana & jae**: Curate, override, and preview the verse of the day and meditation text.
- **`translations` — Käännökset & Anno API**: Kirkkoraamattu 1992, UT2020, and lectionary API cache settings.
- **`display` — Näyttöasetukset**: Daily verse dialog settings, default visibility options.

#### 3. Liturgy of Hours (*Hetkirukoukset*)
- **`schedule` — Hetkirukousten aikataulu**: Configure hour time slots (Laudes, Seksti, Vesper, Kompletorio).
- **`texts` — Hetkitekstit & lukukappaleet**: Review, curate, or customize psalms, antiphons, and prayers for specific days.
- **`calendar` — Kirkkovuosi & liturgiset värit**: Liturgical calendar preferences, seasonal texts, color rules.

#### 4. General Settings (*Yleiset asetukset*)
- **`parish` — Seurakunnan & yhtymän tiedot**: Parish name, union membership, contact info.
- **`appearance` — Kirkon ilme & väripaletti**: Church brand guidelines, liturgical palettes, local parish accent color.
- **`logos` — Logot & vaakunat**: Official EVL circle logo language (FI / FI-SE / SE-FI / EN), custom parish logo, pastor seal, bishop crest.
- **`users` — Käyttäjähallinta (`UserManager`)**: User accounts, Entra ID / Tunnus links, roles (admin, coordinator, worker, bishop, user).
- **`tenants` — Seurakunnat (`TenantManager`)**: Multi-tenant parish creation, slugs, and domains.

### 3.2 Role-Based Access Control (RBAC) in Two-Tier Structure

| Role | Accessible Tier 1 Categories | Default Landing Sub-tab |
|------|------------------------------|-------------------------|
| **Bishop / Bishop Assistant** | `Esirukoukset` (only Bishop sub-tab) | `bishop` |
| **Worker (*Työntekijä*)** | `Esirukoukset` (`public`, `staff`) | `public` |
| **Coordinator (*Koordinaattori*)** | `Esirukoukset` (`public`, `staff`, `highlights`, `intercession-export`) | `public` |
| **Admin (*Pääkäyttäjä*)** | All 4 categories (`prayers`, `bible`, `hours`, `general`) and all sub-tabs | `public` |

---

## 4. Technical Implementation Steps

### Phase 1: Shared Components & Navigation
1. Create `LandingHero` component:
   - Configurable for all three pages with title, subtitle, parish info, primary action button, and sibling links.
2. Create `DailyVerseModal` component:
   - Modal displaying the daily scripture, reflection, reference, and liturgical color indicator.
3. Update `Header.jsx`:
   - Replace single-link navigation with clear navigation to all three pages:
     - *Esirukoukset* (`/`)
     - *Raamattu & Päivän sana* (`/bible`)
     - *Hetkirukous* (`/prayer-moment`)
     - Admin & Intercession list (for authorized users).

### Phase 2: Page Split Implementation
1. **Prayer Intentions Page (`HomePage.jsx`)**:
   - Refactor hero to feature `[✍️ Jätä esirukouspyyntö]` button and sibling links to Bible and Moment of Prayer.
   - Remove inline `FrontPageBibleWidget`.
2. **Bible & Word of the Day Page (`BiblePage.jsx`)**:
   - Add hero with `[📜 Näytä päivän sana]` button opening `DailyVerseModal`.
   - Add sibling navigation links to Prayer Intentions and Moment of Prayer.
   - Present liturgical day information, lectionary readings, and date lookup.
3. **Moment of Prayer Page (`PrayerMomentPage.jsx`)**:
   - Implement dedicated Liturgy of the Hours page.
   - Primary action `[🕊️ Rukoile nyt]` immediately selects the current time-of-day hour.
   - Displays complete liturgical text ready to pray without navigation barriers.
   - Sibling links to Prayer Intentions and Bible pages.

### Phase 3: Two-Tier Admin Panel
1. Refactor `AdminPanel.jsx`:
   - Implement Tier-1 tabs: `prayers`, `bible`, `hours`, `general`.
   - Implement Tier-2 sub-tabs dynamically filtered by selected Tier-1 category and user role.
   - Support deep linking via URL params (e.g. `/admin/prayers/bishop` or `/admin/general/logos`).
2. Modularize settings from `SettingsManager.jsx`:
   - Prayer week rotation, groups, and tags -> `Prayer Intentions -> Kierto & Ryhmät`.
   - Bible and Anno settings -> `Bible Word`.
   - Liturgy schedule and texts -> `Liturgy of Hours`.
   - Parish info, branding, and logos -> `General`.

### Phase 4: Localization & Verification
1. Update i18n dictionaries (`fi.json`, `en.json`, `sv.json`):
   - Add all navigation, action button labels, and admin category keys.
2. Run automated test suites:
   - Backend unit and MCP tests (`npm test` in `backend`).
   - Frontend production build (`npm run build` in `frontend`).
3. Verify responsive layout on mobile, tablet, and desktop viewports.

---

## 5. Verification & Definition of Done

- [ ] All three landing pages exist and route cleanly:
  - `/` -> Prayer Intentions with Leave Prayer Intention modal button & cross-navigation.
  - `/bible` -> Bible & Word of the Day with Show Verse modal button & cross-navigation.
  - `/prayer-moment` -> Moment of Prayer with Pray Now button & cross-navigation.
- [ ] Admin panel features clear two-tier navigation across 4 primary domains.
- [ ] Role restrictions remain strictly enforced for Bishop, Worker, Coordinator, and Admin.
- [ ] All automated tests pass and frontend builds with zero errors.
- [ ] Pull request created as a draft on GitHub.
