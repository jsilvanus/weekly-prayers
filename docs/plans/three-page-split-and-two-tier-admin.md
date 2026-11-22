# Architectural & Implementation Plan: Four-Page Split, Hartaus (Curated Devotions), Two-Tier Admin & Modular Tenants

**Branch**: `feat/three-page-split-and-two-tier-admin`  
**Status**: Draft Plan & Implementation Roadmap  
**Application**: Weekly Prayers (Rukousaiheet / Seurakunnan rukous- ja hartauselämä)

---

## 1. Executive Summary & Objective

The application is expanding from a prayer-list-focused layout into a modular, multi-pillar spiritual platform for Evangelical Lutheran parishes. The core experience will be organized into **four primary landing pages**:

1. **Prayer Intentions (*Esirukoukset*)**: The central space for parish intercessions, clergy prayers (Pastor & Bishop), ministry staff focus areas, and parishioners' community prayer requests.
2. **Bible & Word of the Day (*Raamattu & Päivän sana*)**: Scripture readings, liturgical day context (theme, season, color, readings), with an immediate interactive dialogue for today's verse and meditation.
3. **Moment of Prayer (*Hetkirukous / Liturgy of the Hours*)**: The canonical hours (*Laudes, Seksti, Vesper, Kompletorio*) with a prominent **"Pray Now"** action that immediately opens the prayer matching the current time of day with all liturgical texts ready.
4. **Curated Devotion (*Hartaus*)**: Complete, pre-prepared devotional services authored by priests and parish workers (*"all texts and thoughts are ready for you"*), featuring a pastoral reflection, curated scripture, intercessory prayer, hymn suggestion, and blessing.

### Key New Capabilities
- **Modular Tenant Architecture**: Every parish (tenant) can selectively enable or disable any of the four modules via Tenant Settings. If a parish chooses only *Esirukoukset* and *Hartaus*, the other modules are hidden in navigation, cross-links, and routing.
- **New User Role: `priest` (*Pappi / Hartauskirjoittaja*)**: Dedicated user group with permissions to author, schedule, edit, and publish devotions (*hartaudet*).
- **Two-Tier Administrative Control**: A structured two-tier navigation dividing management into five logical domains: *Prayer Intentions*, *Bible Word*, *Liturgy of Hours*, *Devotions (Hartaus)*, and *General Settings*.

---

## 2. Four Main Landing Pages: Architecture & User Experience

Each active landing page follows a unified, recognizable layout consisting of:
1. **Parish Context Header** (with parish name, optional Yhtymä switcher, and logos).
2. **Hero Action Section** with a high-visibility **Primary Action Button** and **Sibling Navigation Pills** pointing to the other active modules.
3. **Dedicated Content Flow**.

```
+---------------------------------------------------------------------------------------------------------+
|                                             SHARED HEADER                                               |
| [EVL Logo] [Parish Logo]   Esirukoukset | Raamattu & Päivän sana | Hetkirukous | Hartaus                |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
| [Pillar 1: Esirukoukset]  [Pillar 2: Raamattu]      [Pillar 3: Hetkirukous]     [Pillar 4: Hartaus]     |
| Path: / or /prayers       Path: /bible              Path: /prayer-moment        Path: /hartaus          |
|                                                                                                         |
| * Primary Action:         * Primary Action:         * Primary Action:           * Primary Action:       |
|   [✍️ Jätä esirukouspyyntö] [📜 Näytä päivän sana]   [🕊️ Rukoile nyt]            [🕯️ Hiljenny hartauteen]|
|   (Opens Submission Modal)(Opens Verse Dialog)      (Opens Current Hour)        (Focuses Ready Devotion)|
|                                                                                                         |
| * Sibling Navigation:     * Sibling Navigation:     * Sibling Navigation:       * Sibling Navigation:   |
|   [📖 Raamattu & Sana]     [🙏 Esirukoukset]         [🙏 Esirukoukset]           [🙏 Esirukoukset]       |
|   [🕊️ Hetkirukous]         [🕊️ Hetkirukous]         [📖 Raamattu & Sana]        [📖 Raamattu & Sana]    |
|   [🕯️ Hartaus]             [🕯️ Hartaus]             [🕯️ Hartaus]               [🕊️ Hetkirukous]        |
|                                                                                                         |
| * Content:                * Content:                * Content:                  * Content:              |
|   - Opening Invocation      - Liturgical Day Banner   - Real-time Hour Liturgy    - Today's Hartaus     |
|   - Bishop & Pastor Prayers - Liturgical Color Pill   - Antiphons & Psalms        - Priest's Reflection |
|   - Ministry Requests       - Daily Lectionary        - Scripture & Collect       - Curated Scripture   |
|   - Public Prayer List      - Date Selector           - Hour Switcher Tabs        - Prayer & Blessing   |
|   - Lord's Prayer & Counter - Future Bible Tools      - Lord's Prayer             - Hymn / Music Link   |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+
|                                             SHARED FOOTER                                               |
+---------------------------------------------------------------------------------------------------------+
```

### 2.1 Page 1: Prayer Intentions (*Esirukoukset*) (`/` or `/prayers`)
- **Primary Hero Action**: `[✍️ Jätä esirukouspyyntö]` (*Leave a Prayer Intention*) &rarr; triggers `PrayerModal` for submitting intercessions.
- **Sibling Navigation**: Navigates to active modules (Bible, Moment of Prayer, Hartaus).
- **Content**: Opening invocation, Bishop's prayer with crest, Pastor's prayer, ministry staff requests, public community prayers, and Lord's Prayer with counter.
- *Decoupling*: Inline `FrontPageBibleWidget` is replaced by the dedicated landing pages.

### 2.2 Page 2: Bible & Word of the Day (*Raamattu & Päivän sana*) (`/bible` or `/raamattu`)
- **Primary Hero Action**: `[📜 Näytä päivän sana]` (*Show Me the Verse of the Day*) &rarr; opens `DailyVerseModal` showcasing today's scripture passage, source, liturgical context, and meditation text.
- **Sibling Navigation**: Links to Prayer Intentions, Moment of Prayer, and Hartaus.
- **Content**: Liturgical calendar information (season, day title, theme, liturgical color), date lookup selector, daily lectionary readings, and extensibility slot for future Bible search.

### 2.3 Page 3: Moment of Prayer (*Hetkirukous / Liturgy of the Hours*) (`/prayer-moment` or `/hetkirukous`)
- **Primary Hero Action**: `[🕊️ Rukoile nyt]` (*Pray Now*) &rarr; immediately activates and opens the prayer corresponding to the current time of day:
  - **Laudes (Aamurukous)**: 06:00 – 10:00
  - **Seksti (Päivärukous)**: 11:00 – 16:00
  - **Vesper (Iltarukous)**: 17:00 – 20:00
  - **Kompletorio (Yörukous)**: 21:00 – 05:00
- **Flow**: Full liturgical texts ready to pray (Opening versicle, Antiphon, Psalmody, Scripture, Collect prayer, Lord's Prayer, Blessing).
- **Interactive Controls**: Time-slot switcher tabs to pray any of the 4 hours manually, plus date selector.

### 2.4 Page 4: Curated Devotion (*Hartaus*) (`/hartaus` or `/devotion`)
- **Concept**: A prepared devotional service crafted by priests and pastoral staff for parishioners seeking a peaceful, complete devotional thought without manual assembly.
- **Primary Hero Action**: `[🕯️ Hiljenny päivän hartauteen]` (*Read / Meditate on Today's Devotion*) &rarr; smoothly scrolls/focuses the devotion text.
- **Sibling Navigation**: Direct links to Esirukoukset, Raamattu & Sana, and Hetkirukous.
- **Content Elements**:
  1. **Theme & Introduction**: Title, liturgical alignment, and estimated reading time.
  2. **Author Attribution**: Name, title (e.g. *"Pastori Ville Nieminen"*), parish affiliation, and optional author seal or portrait.
  3. **Curated Scripture (*Päivän raamatunteksti*)**: Selected verse or short passage printed in full (e.g. KR92 / UT2020).
  4. **Priest's Meditation (*Papin hartauspuhe / ajatus*)**: The priest's written reflection or audio recording/podcast embed.
  5. **Closing Prayer & Lord's Prayer (*Rukous ja Isä meidän*)**: Pastoral intercession.
  6. **Blessing (*Herran siunaus*)**: Traditional Aaronic blessing.
  7. **Hymn / Music Recommendation (*Virsiehdotus*)**: Suggested hymn from the Finnish Hymnal (*Virsikirja*) with title and lyrics snippet.
  8. **Archive / Previous Devotions**: Collapsible drawer or list of recent devotions from this parish.

---

## 3. Modular Tenant Settings (Enable / Disable Modules)

Every parish installation or tenant can configure which of the four modules are active.

### 3.1 Module Identifiers
| Module Key | Display Name (FI) | Default Route | Default State |
|------------|-------------------|---------------|---------------|
| `prayers` | Esirukoukset | `/` or `/prayers` | `true` (Enabled) |
| `bible` | Raamattu & Päivän sana | `/bible` | `true` (Enabled) |
| `hours` | Hetkirukous | `/prayer-moment` | `true` (Enabled) |
| `hartaus` | Hartaus | `/hartaus` | `true` (Enabled) |

### 3.2 Tenant Configuration Storage
Stored in the `tenants` table and `site_settings`:
- Column: `tenants.active_modules JSONB DEFAULT '["prayers", "bible", "hours", "hartaus"]'::jsonb`
- Fallback site setting: `site_settings.active_modules`
- Helper service: `isModuleEnabled(tenantSlug, 'hartaus')` returning a boolean.

### 3.3 Dynamic Application Behavior
1. **Header Navigation**:
   - Navigation links for disabled modules are automatically hidden.
2. **Landing Page Sibling Navigation**:
   - Sibling links on any active page only link to other *enabled* modules. For instance, if `hours` is disabled, a user on *Esirukoukset* sees only links to *Raamattu* and *Hartaus*.
3. **Routing Fallback & Safeguards**:
   - If a user navigates directly to a disabled route (e.g. `/hours`), they are gracefully redirected to the tenant's first active module (e.g. `/` or `/hartaus`), with an optional gentle toast notice.
   - Root path (`/`) dynamically resolves to the first enabled module if `prayers` is deactivated.
4. **Tenant Management UI**:
   - In `AdminPanel -> General -> TenantManager` and `SettingsManager`, administrators toggle modules via interactive checkboxes:
     - `[x] Esirukoukset (Prayer Intentions)`
     - `[x] Raamattu & Päivän sana (Bible & Word of the Day)`
     - `[x] Hetkirukoukset (Liturgy of the Hours)`
     - `[x] Hartaus (Curated Priest Devotions)`

---

## 4. Priests User Role & Hartaus Authoring System

### 4.1 New User Role: `priest` (*Pappi*)
- Added to PostgreSQL enum:
  ```sql
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'priest';
  ```
- Role Hierarchy & Permissions:
  - `user`: Public user (leaves public prayer requests, reads content).
  - `prayer_group`: Views prayer lists.
  - `worker`: Submits staff prayer requests, views intercessions.
  - **`priest` (*Pappi*)**: All worker rights + full authoring, editing, and publishing permissions for **Hartaus** devotions.
  - `coordinator`: Moderates prayers, manages highlights.
  - `bishop`: Diocesan prayers & crest.
  - `admin`: Full configuration across all modules, roles, and tenants.
- OIDC Mapping:
  - Parish Azure AD / Tunnus groups (e.g. `sg-papisto`, `priests`) automatically map to the `priest` role via `OIDC_GROUP_ROLE_MAP`.

### 4.2 Data Model: `devotions` (Hartaudet)
```sql
CREATE TABLE devotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(255) NOT NULL,
    author_title VARCHAR(255) DEFAULT 'Pastori',
    author_image_url TEXT,
    title VARCHAR(255) NOT NULL,
    liturgical_day VARCHAR(255),
    scripture_reference VARCHAR(255),
    scripture_text TEXT,
    meditation_content TEXT NOT NULL,
    closing_prayer TEXT,
    hymn_suggestion VARCHAR(255),
    audio_url TEXT,
    publish_start_date DATE NOT NULL,
    publish_end_date DATE,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devotions_tenant ON devotions(tenant_id);
CREATE INDEX idx_devotions_dates ON devotions(publish_start_date, publish_end_date);
CREATE INDEX idx_devotions_published ON devotions(is_published) WHERE is_published = TRUE;
```

---

## 5. Two-Tier Administrative Control Panel

The administrative panel (`/admin`) is organized into **five primary domains (Tier 1)** with specialized sub-views (Tier 2).

```
===========================================================================================================
ADMINISTRATIVE PANEL (/admin)
===========================================================================================================

[TIER 1 DOMAINS]
  (🙏 Esirukoukset) | (📖 Raamattu & Sana) | (🕊️ Hetkirukous) | (🕯️ Hartaus) | (⚙️ Yleiset asetukset)
-----------------------------------------------------------------------------------------------------------
[TIER 2 SUB-TABS (Example when 'Hartaus' is active)]
  [Kirjoita uusi hartaus]  [Julkaistut hartaudet]  [Aikataulutetut]  [Kirjoittajaprofiilit]
-----------------------------------------------------------------------------------------------------------

[ACTIVE COMPONENT CONTAINER]
  ... Rich editor, scheduling tools, or devotion list ...
```

### 5.1 Domain Breakdown

#### 1. Prayer Intentions (*Esirukoukset*)
- Sub-tabs:
  - `public`: Community prayer moderation queue & AI review (`PrayerManager`).
  - `staff`: Ministry prayer submissions (`StaffPrayerForm`).
  - `pastor`: Weekly pastor prayer (`PastorPrayerForm`).
  - `bishop`: Diocesan bishop prayer & crest (`BishopPrayerForm`).
  - `highlights`: Highlights & priority items (`HighlightManager`).
  - `cycle-groups`: Prayer week rotation day (e.g. Thursday) and custom ministry tags.
  - `export`: Sunday service intercession list printout.

#### 2. Bible Word (*Raamattu & Päivän sana*)
- Sub-tabs:
  - `daily-verse`: Daily verse curation, manual override, and meditation text.
  - `translations`: Bible translation settings (KR92, UT2020) and Anno API lectionary cache.
  - `display`: Verse of the day dialog settings.

#### 3. Liturgy of Hours (*Hetkirukoukset*)
- Sub-tabs:
  - `schedule`: Time-slot boundaries for Laudes, Seksti, Vesper, Kompletorio.
  - `texts`: Review and customize hour antiphons, psalms, and collect prayers.
  - `calendar`: Liturgical season overrides and color mappings.

#### 4. Devotions (*Hartaus*) &larr; *NEW*
- Sub-tabs:
  - `editor`: Create or edit a devotion (Theme, scripture, reflection, prayer, hymn, audio).
  - `published`: Currently active and scheduled devotions.
  - `archive`: Historical devotions repository.
  - `authors`: Priest profiles, titles, and photos.

#### 5. General Settings (*Yleiset asetukset*)
- Sub-tabs:
  - `modules`: **Tenant Active Modules Manager** (toggle Esirukoukset, Raamattu, Hetkirukous, Hartaus).
  - `parish`: Parish & yhtymä details, code, and contact information.
  - `appearance`: Church graphic guidelines, liturgical color palette, local accent color.
  - `logos`: Official EVL circle logo language (FI, FI-SE, SE-FI, EN), parish logo, pastor seal, bishop crest.
  - `users`: User and role management (`UserManager`), supporting `priest`, `bishop`, `worker`, etc.
  - `tenants`: Multi-tenant parish union management (`TenantManager`).

### 5.2 Role Scoping Matrix
| Role | Accessible Tier 1 Domains | Default Landing View |
|------|---------------------------|----------------------|
| **Priest (*Pappi*)** | `Hartaus`, `Esirukoukset` (staff & public) | `Hartaus &rarr; Kirjoita uusi` |
| **Bishop / Assistant** | `Esirukoukset` (only Bishop prayer) | `Esirukoukset &rarr; Piispa` |
| **Worker (*Työntekijä*)** | `Esirukoukset` (staff & public) | `Esirukoukset &rarr; Julkiset` |
| **Coordinator** | `Esirukoukset` (moderation, highlights, export) | `Esirukoukset &rarr; Julkiset` |
| **Admin** | All 5 domains and all sub-views | `Esirukoukset &rarr; Julkiset` |

---

## 6. Technical Implementation Phases

### Phase 1: Database Migration & Backend Services
1. Create migration `017_hartaus_and_tenant_modules.sql`:
   - Add `'priest'` to `user_role` enum.
   - Add `active_modules JSONB` column to `tenants` and `site_settings`.
   - Create `devotions` table with indexes.
2. Build `backend/src/services/devotionService.js`:
   - `getTodayDevotion(tenantSlug, date)`
   - `listDevotions(tenantSlug, filter)`
   - `createDevotion(data, user)`
   - `updateDevotion(id, data, user)`
   - `deleteDevotion(id, user)`
3. Build `backend/src/routes/devotions.js` with role authentication.
4. Update `tenantService.js` and `settingsService.js` to expose module flags.

### Phase 2: Frontend State & Context Architecture
1. Update `TenantContext` & `SettingsContext` to provide `activeModules` and `isModuleEnabled(key)`.
2. Update `AuthContext` to support `isPriest`, `canAuthorDevotions`, and priest role badges.

### Phase 3: The Four Landing Pages
1. Implement `LandingHero` reusable header with primary action button and dynamic sibling navigation respecting active tenant modules.
2. Refactor `HomePage.jsx` into dedicated **Prayer Intentions** page.
3. Enhance `BiblePage.jsx` with `DailyVerseModal` and lectionary readings.
4. Implement `PrayerMomentPage.jsx` for **Liturgy of the Hours** with real-time "Pray Now" hour resolution.
5. Implement `DevotionPage.jsx` (*Hartaus*) displaying the priest's prepared devotion, audio link, hymn recommendation, and reflection.

### Phase 4: Two-Tier Admin & Devotion Authoring UI
1. Refactor `AdminPanel.jsx` to render Tier 1 domains and Tier 2 sub-tabs.
2. Create `DevotionManager.jsx`:
   - Rich form for priests to compose devotions, attach scripture, write reflections, pick hymns, and schedule publication dates.
3. Add module toggle controls into `TenantManager.jsx` and `SettingsManager.jsx`.

### Phase 5: I18n & Quality Assurance
1. Add translation keys across `fi.json`, `en.json`, and `sv.json` for all 4 pages, Hartaus terms, priest roles, and module settings.
2. Run backend tests and verify production frontend build.

---

## 7. Definition of Done

- [ ] Four dedicated landing pages exist: `/` (Prayer Intentions), `/bible` (Bible & Word), `/prayer-moment` (Moment of Prayer), and `/hartaus` (Curated Devotion).
- [ ] Each page features its distinctive primary action button and dynamic cross-navigation to other enabled modules.
- [ ] Tenant settings support enabling/disabling any module, cleanly updating navigation, cross-links, and routes.
- [ ] New `priest` user role enables parish clergy to author and publish devotions.
- [ ] Administrative panel features two-tier hierarchical navigation with full role-based access control.
- [ ] All tests pass and frontend builds with zero warnings or errors.
