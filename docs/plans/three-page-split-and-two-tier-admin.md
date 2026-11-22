# Architectural & Implementation Plan: Four-Page Split, Hartaus (Curated Devotions), Two-Tier Admin & Modular Tenants

**Branch**: `feat/three-page-split-and-two-tier-admin`  
**Status**: Draft Plan & Implementation Roadmap  
**Application**: Weekly Prayers (Rukousaiheet / Seurakunnan rukous- ja hartauselämä)

---

## 1. Executive Summary & Objective

The application is expanding from a prayer-list-focused layout into a modular, multi-pillar spiritual platform for Evangelical Lutheran parishes. The core experience is organized into **four primary landing pages**:

1. **Prayer Intentions (*Esirukoukset*)**: The central space for parish intercessions, clergy prayers (Pastor & Bishop), ministry staff focus areas, and parishioners' community prayer requests.
2. **Bible & Word of the Day (*Raamattu & Päivän sana*)**: Scripture readings, liturgical day context (theme, season, color, readings), with an immediate interactive dialogue for today's verse and meditation.
3. **Moment of Prayer (*Hetkirukous / Liturgy of the Hours*)**: The canonical hours (*Laudes, Seksti, Vesper, Kompletorio*) with a prominent **"Pray Now"** action that immediately opens the prayer matching the current time of day with all liturgical texts ready.
4. **Curated Devotion (*Hartaus*)**: Complete, pre-prepared devotional services authored by priests and pastoral staff (*"all texts and thoughts are ready for you"*). **Always presents exactly one devotion for today with zero user decision stress**, switching cleanly at midnight.

### Key Architectural Capabilities
- **Single-Devotion Serenity (Calendar-Day Focus)**: The `/hartaus` page strictly shows **only one devotion** for the current calendar day. There are no lists, archives, or selectors on the page, eliminating reading hesitation or decision fatigue. It switches automatically at midnight (00:00 local parish time).
- **Dual Authoring Formats (Freeform & Structured)**: Authors can write devotions either as a **single clear text block** (clean, contiguous writing) or as a **structured multi-part devotion** (distinct scripture, meditation, prayer, hymn suggestion, blessing).
- **New User Group & Role: `devotion` (*Devotion / Hartauskirjoittaja*)**: Dedicated user role for authors (pastors, deacons, parish workers, invited writers) with rights to compose and schedule devotions.
- **Modular Tenant Architecture**: Every parish (tenant) can selectively enable or disable any of the four modules via Tenant Settings. If a parish chooses only *Esirukoukset* and *Hartaus*, the other modules are hidden in navigation, cross-links, and routing.
- **Two-Tier Administrative Control**: A structured two-tier navigation dividing management into five logical domains: *Prayer Intentions*, *Bible Word*, *Liturgy of Hours*, *Devotions (Hartaus)*, and *General Settings*.

---

## 2. Four Main Landing Pages: Architecture & User Experience

Each active landing page follows a unified, recognizable layout consisting of:
1. **Parish Context Header** (parish name, optional Yhtymä switcher, and official logos).
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
|   (Opens Submission Modal)(Opens Verse Dialog)      (Opens Current Hour)        (Focuses Today's Text)  |
|                                                                                                         |
| * Sibling Navigation:     * Sibling Navigation:     * Sibling Navigation:       * Sibling Navigation:   |
|   [📖 Raamattu & Sana]     [🙏 Esirukoukset]         [🙏 Esirukoukset]           [🙏 Esirukoukset]       |
|   [🕊️ Hetkirukous]         [🕊️ Hetkirukous]         [📖 Raamattu & Sana]        [📖 Raamattu & Sana]    |
|   [🕯️ Hartaus]             [🕯️ Hartaus]             [🕯️ Hartaus]               [🕊️ Hetkirukous]        |
|                                                                                                         |
| * Content:                * Content:                * Content:                  * Content:              |
|   - Opening Invocation      - Liturgical Day Banner   - Real-time Hour Liturgy    - EXACTLY ONE DEVOTION|
|   - Bishop & Pastor Prayers - Liturgical Color Pill   - Antiphons & Psalms        - Midnight Auto-Switch|
|   - Ministry Requests       - Daily Lectionary        - Scripture & Collect       - Zero User Choices   |
|   - Public Prayer List      - Date Selector           - Hour Switcher Tabs        - Author Attribution  |
|   - Lord's Prayer & Counter - Future Bible Tools      - Lord's Prayer             - Single or Structured|
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
- **Core Principle: Zero Stress, Pure Serenity**:
  - The reader is never presented with an archive, dropdown, search bar, or multiple options.
  - **Exactly one devotion** is shown: the devotion for today's calendar date.
  - Automatically transitions to the new devotion at **midnight (00:00)** local parish time.
  - If no custom devotion was authored for a specific day, a peaceful liturgical fallback (today's church lectionary scripture, collect prayer, and blessing) is automatically served.
- **Primary Hero Action**: `[🕯️ Hiljenny päivän hartauteen]` (*Meditate on Today's Devotion*) &rarr; smoothly scrolls/focuses the devotion text.
- **Sibling Navigation**: Direct links to Esirukoukset, Raamattu & Sana, and Hetkirukous.
- **Rendering Both Formats**:
  - **Single Clear Text Block**: For devotions written as a single flowing text, rendered with elegant typography, comfortable line height, author attribution, and optional audio recording.
  - **Structured Devotion**: Rendered with clean liturgical sections (Theme & Scripture &rarr; Meditation Reflection &rarr; Intercession &rarr; Hymn recommendation &rarr; Blessing).

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
   - If a user navigates directly to a disabled route (e.g. `/hours`), they are gracefully redirected to the tenant's first active module (e.g. `/` or `/hartaus`).
   - Root path (`/`) dynamically resolves to the first enabled module if `prayers` is deactivated.
4. **Tenant Management UI**:
   - In `AdminPanel -> General -> TenantManager` and `SettingsManager`, administrators toggle modules via interactive checkboxes:
     - `[x] Esirukoukset (Prayer Intentions)`
     - `[x] Raamattu & Päivän sana (Bible & Word of the Day)`
     - `[x] Hetkirukoukset (Liturgy of the Hours)`
     - `[x] Hartaus (Curated Devotions)`

---

## 4. `Devotion` User Group & Authoring System

### 4.1 User Role: `devotion` (*Devotion / Hartauskirjoittaja*)
- Named **`devotion`** (rather than Priest) so any designated author (priest, deacon, youth worker, guest writer) can be granted access.
- Added to PostgreSQL enum:
  ```sql
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'devotion';
  ```
- Role Hierarchy & Permissions:
  - `user`: Public user (leaves public prayer requests, reads content).
  - `prayer_group`: Views prayer lists.
  - `worker`: Submits staff prayer requests, views intercessions.
  - **`devotion` (*Hartauskirjoittaja*)**: Dedicated access to compose, schedule, edit, and publish devotions.
  - `coordinator`: Moderates prayers, manages highlights.
  - `bishop`: Diocesan prayers & crest.
  - `admin`: Full configuration across all modules, roles, and tenants.
- OIDC Group Mapping:
  - Enterprise directory groups (e.g. `sg-devotions`, `sg-hartaus`, `sg-papisto`) automatically map to the `devotion` role via `OIDC_GROUP_ROLE_MAP`.

### 4.2 Data Model: `devotions` (Hartaudet)
```sql
CREATE TYPE devotion_format AS ENUM ('single_block', 'structured');

CREATE TABLE devotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(255) NOT NULL,
    author_title VARCHAR(255) DEFAULT 'Pastori',
    author_image_url TEXT,
    title VARCHAR(255) NOT NULL,
    
    -- Format selector: single contiguous text block OR structured components
    format devotion_format NOT NULL DEFAULT 'single_block',
    
    -- Single block text (when format = 'single_block')
    content TEXT,
    
    -- Structured fields (when format = 'structured')
    liturgical_day VARCHAR(255),
    scripture_reference VARCHAR(255),
    scripture_text TEXT,
    meditation_content TEXT,
    closing_prayer TEXT,
    hymn_suggestion VARCHAR(255),
    
    -- Common media & audio
    audio_url TEXT,
    
    -- Calendar-day schedule: exactly one devotion per date (switches at midnight)
    target_date DATE NOT NULL,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_devotion_tenant_date UNIQUE (tenant_id, target_date)
);

CREATE INDEX idx_devotions_tenant_date ON devotions(tenant_id, target_date);
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
[TIER 2 SUB-TABS (when 'Hartaus' is active)]
  [Kirjoita hartaus]  [Kalenteriaikataulu]  [Omat kirjoitukset]  [Kirjoittajaprofiili]
-----------------------------------------------------------------------------------------------------------

[ACTIVE COMPONENT CONTAINER]
  ... Rich editor (Single Text Box OR Structured), Calendar Scheduler, or Devotion settings ...
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

#### 4. Devotions (*Hartaus*) &larr; *Devotion Authoring Hub*
- Sub-tabs:
  - `editor`: **Devotion Composer**:
    - Format toggle: **"Yhtenäinen teksti (Single Text Block)"** vs. **"Rakenteinen hartaus (Structured)"**.
    - Target calendar date picker (`target_date`) with midnight activation.
    - Title, author name & title, audio link.
    - Single text area (Freeform) OR structured fields (Scripture, Meditation, Prayer, Hymn, Blessing).
  - `schedule`: **Calendar Grid View**: Visual calendar indicating which dates have prepared devotions and which will use the liturgical fallback.
  - `my-devotions`: List of devotions authored by the current user.
  - `author-profile`: Personal author signature, title, and optional seal/portrait.

#### 5. General Settings (*Yleiset asetukset*)
- Sub-tabs:
  - `modules`: **Tenant Active Modules Manager** (toggle Esirukoukset, Raamattu, Hetkirukous, Hartaus).
  - `parish`: Parish & yhtymä details, code, and contact information.
  - `appearance`: Church graphic guidelines, liturgical color palette, local accent color.
  - `logos`: Official EVL circle logo language (FI, FI-SE, SE-FI, EN), parish logo, pastor seal, bishop crest.
  - `users`: User and role management (`UserManager`), supporting `devotion`, `bishop`, `worker`, etc.
  - `tenants`: Multi-tenant parish union management (`TenantManager`).

### 5.2 Role Scoping Matrix
| Role | Accessible Tier 1 Domains | Default Landing View |
|------|---------------------------|----------------------|
| **Devotion (*Hartauskirjoittaja*)** | `Hartaus`, `Esirukoukset` (staff & public) | `Hartaus &rarr; Kirjoita hartaus` |
| **Bishop / Assistant** | `Esirukoukset` (only Bishop prayer) | `Esirukoukset &rarr; Piispa` |
| **Worker (*Työntekijä*)** | `Esirukoukset` (staff & public) | `Esirukoukset &rarr; Julkiset` |
| **Coordinator** | `Esirukoukset` (moderation, highlights, export) | `Esirukoukset &rarr; Julkiset` |
| **Admin** | All 5 domains and all sub-views | `Esirukoukset &rarr; Julkiset` |

---

## 6. Technical Implementation Phases

### Phase 1: Database Migration & Backend Services
1. Create migration `017_hartaus_and_tenant_modules.sql`:
   - Add `'devotion'` to `user_role` enum.
   - Create `devotion_format` enum (`'single_block'`, `'structured'`).
   - Add `active_modules JSONB` column to `tenants` and `site_settings`.
   - Create `devotions` table with unique constraint on `(tenant_id, target_date)` ensuring exactly one devotion per day.
2. Build `backend/src/services/devotionService.js`:
   - `getTodayDevotion(tenantSlug, date)`: Fetches devotion for today; if missing, returns graceful liturgical fallback.
   - `getDevotionByDate(tenantSlug, date)`: For admin/editor lookup.
   - `saveDevotion(data, user)`: Upserts devotion for the specified calendar date.
   - `getCalendarOverview(tenantSlug, year, month)`: For administrative schedule grid.
3. Build `backend/src/routes/devotions.js` with authentication and role check for `devotion` or `admin`.
4. Update `tenantService.js` and `settingsService.js` to expose module flags.

### Phase 2: Frontend State & Context Architecture
1. Update `TenantContext` & `SettingsContext` to provide `activeModules` and `isModuleEnabled(key)`.
2. Update `AuthContext` to support `isDevotionAuthor` (`role === 'devotion' || role === 'admin'`) and role badges.

### Phase 3: The Four Landing Pages
1. Implement `LandingHero` reusable header with primary action button and dynamic sibling navigation respecting active tenant modules.
2. Refactor `HomePage.jsx` into dedicated **Prayer Intentions** page.
3. Enhance `BiblePage.jsx` with `DailyVerseModal` and lectionary readings.
4. Implement `PrayerMomentPage.jsx` for **Liturgy of the Hours** with real-time "Pray Now" hour resolution.
5. Implement `DevotionPage.jsx` (*Hartaus*):
   - Strictly shows **one** devotion for today's calendar day.
   - Auto-refreshes / switches at midnight.
   - Zero user selection choices or stress.
   - Renders cleanly whether author chose single text block or structured format.

### Phase 4: Two-Tier Admin & Devotion Authoring UI
1. Refactor `AdminPanel.jsx` to render Tier 1 domains and Tier 2 sub-tabs.
2. Create `DevotionManager.jsx`:
   - Format toggle: Single Text Block (contiguous textarea) vs. Structured fields.
   - Target date selector (`target_date`).
   - Visual calendar overview showing scheduled dates.
3. Add module toggle controls into `TenantManager.jsx` and `SettingsManager.jsx`.

### Phase 5: I18n & Quality Assurance
1. Add translation keys across `fi.json`, `en.json`, and `sv.json` for all 4 pages, Hartaus terms, `devotion` role, and module settings.
2. Run backend tests and verify production frontend build.

---

## 7. Definition of Done

- [ ] Four dedicated landing pages exist: `/` (Prayer Intentions), `/bible` (Bible & Word), `/prayer-moment` (Moment of Prayer), and `/hartaus` (Curated Devotion).
- [ ] `/hartaus` strictly renders **only one devotion** for the current calendar day with zero selection choices or stress for the user, switching at midnight.
- [ ] Both single text block (freeform) and structured devotion authoring modes are fully supported.
- [ ] Each landing page features its distinctive primary action button and dynamic cross-navigation to other enabled modules.
- [ ] Tenant settings support enabling/disabling any module, cleanly updating navigation, cross-links, and routes.
- [ ] New `devotion` user role enables authors (pastors, workers, guest writers) to compose and schedule devotions.
- [ ] Administrative panel features two-tier hierarchical navigation with full role-based access control.
- [ ] All tests pass and frontend builds with zero warnings or errors.
