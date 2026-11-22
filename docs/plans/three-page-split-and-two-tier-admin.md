# Architectural & Implementation Plan: Four-Page Split, Hartaus (Curated Devotions), EVL Liturgy of Hours & Embedded Intercessions, Two-Tier Admin & Modular Tenants

**Branch**: `feat/three-page-split-and-two-tier-admin`  
**Status**: Draft Plan & Implementation Roadmap  
**Application**: Weekly Prayers (Rukousaiheet / Seurakunnan rukous- ja hartauselämä)

---

## 1. Executive Summary & Objective

The application is expanding from a prayer-list-focused layout into a modular, multi-pillar spiritual platform for Evangelical Lutheran parishes. The core experience is organized into **four primary landing pages**:

1. **Prayer Intentions (*Esirukoukset*)**: The central space for parish intercessions, clergy prayers (Pastor & Bishop), ministry staff focus areas, and parishioners' community prayer requests.
2. **Bible & Word of the Day (*Raamattu & Päivän sana*)**: Scripture readings, liturgical day context (theme, season, color, readings), with an immediate interactive dialogue for today's verse and meditation.
3. **Moment of Prayer (*Hetkirukous / Liturgy of the Hours*)**: Authentic liturgies following the **Evangelical Lutheran Church in Finland's Manual of Rituals (*Kirkkokäsikirja*)** (*Laudes, Seksti, Vesper, Kompletorio*, plus the newly integrated ***Pieni rukoushetki***). Features a prominent **"Pray Now"** action and an **embedded prayer intentions dialogue** during intercessory prayers.
4. **Curated Devotion (*Hartaus*)**: Complete, pre-prepared devotional services authored by pastors and parish workers (*"all texts and thoughts are ready for you"*). **Always presents exactly one devotion for today with zero user decision stress**, switching cleanly at midnight. **The writer's name is always visible, supporting three flexible attribution options** (the adding user, another user account from OIDC, or a freeform description such as *"an old parishioner"*).

### Key Architectural Capabilities
- **Three-Way Author Attribution for Devotions**:
  1. *The adding user* (default: current logged-in author).
  2. *On behalf of another user* (designate another registered OIDC account from the parish).
  3. *Freeform attribution* (a free text string such as *"Iäkäs seurakuntalainen"*, *"Kirkkoisä Augustinus"*, or *"Eräs rippikoululainen"*).
- **Exact EVL Kirkkokäsikirja Liturgies**: All five prayer moments follow the official rubrics and texts of the Church of Finland (*Kirkkokäsikirja* / *Jumalanpalvelusten kirja* & *Kirkollisten toimitusten kirja*):
  - **Aamurukous (*Laudes*)** with Benedictus
  - **Päivärukous (*Ad sextam / Seksti*)**
  - **Iltarukous (*Vesper*)** with Magnificat
  - **Rukous päivän päättyessä (*Kompletorio*)** with Confession & Nunc Dimittis
  - **Pieni rukoushetki** (*The Small Prayer Moment*): versatile, anytime quiet pause
- **Embedded Parish Intercessions in Liturgy**: In each liturgy, during the intercessory prayer (*Esirukous*) section, users can open an embedded modal dialog displaying the parish's active community and clergy prayer requests, allowing them to pray for actual local intentions within the liturgical flow.
- **Single-Devotion Serenity (Calendar-Day Focus)**: The `/hartaus` page strictly shows **only one devotion** for the current calendar day. No lists, archives, or selectors clutter the page, eliminating reading hesitation or decision fatigue. It switches automatically at midnight (00:00 local parish time).
- **Dual Devotion Authoring Formats (Freeform & Structured)**: Authors can write devotions either as a **single clear text block** (clean, contiguous writing) or as a **structured multi-part devotion** (distinct scripture, meditation, prayer, hymn suggestion, blessing).
- **User Group & Role: `devotion` (*Devotion / Hartauskirjoittaja*)**: Dedicated user role for authors (pastors, deacons, parish workers, invited writers) with rights to compose and schedule devotions.
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
|   - Opening Invocation      - Liturgical Day Banner   - Official EVL Kirkkokäsi-  - EXACTLY ONE DEVOTION|
|   - Bishop & Pastor Prayers - Liturgical Color Pill     kirja Liturgies (Laudes,  - Midnight Auto-Switch|
|   - Ministry Requests       - Daily Lectionary          Seksti, Vesper, Komple-   - Zero User Choices   |
|   - Public Prayer List      - Date Selector             torio, Pieni rukoushetki) - Writer Attribution  |
|   - Lord's Prayer & Counter - Future Bible Tools      - Embedded Intercessions      (Self/User/Freeform)|
|                                                         Modal Dialog              - Single or Structured|
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
  - **Aamurukous (*Laudes*)**: 06:00 – 10:00
  - **Päivärukous (*Seksti*)**: 11:00 – 16:00
  - **Iltarukous (*Vesper*)**: 17:00 – 20:00
  - **Yörukous (*Kompletorio*)**: 21:00 – 05:00
  - **Pieni rukoushetki (*The Small Prayer Moment*)**: Selectable anytime as a versatile quiet pause.

#### Complete Liturgical Orders according to EVL Kirkkokäsikirja

1. **Aamurukous (*Laudes*)**:
   - **Johdanto**: *"Herra, avaa minun huuleni, niin suuni julistaa sinun kunniaasi."* / *"Jumala, riennä minua auttamaan. Herra, kiirehdi minun avukseni. Kunnia Isälle ja Pojalle ja Pyhälle Hengelle, niin kuin oli alussa, nyt on ja aina, iankaikkisesta iankaikkiseen. Aamen. Halleluja."*
   - **Aamuvirsi / Hymni**
   - **Aamupsalmi & Antifoni** (johon liitetään Pieni kunnia / *Gloria Patri*)
   - **Raamatunluku** (kirkkovuoden / lektionaarin mukainen)
   - **Responsorio** tai hiljainen mietiskely
   - **Sakariaan kiitosvirsi (*Benedictus*)**: *"Kiitetty olkoon Herra, Israelin Jumala! Hän on katsonut kansansa puoleen ja valmistanut sille lunastuksen..."*
   - **Yhteinen esirukous**: Sisältää painikkeen `[📋 Rukoile seurakunnan esirukousaiheiden puolesta]` avaten `EmbeddedIntercessionsModal`.
   - **Isä meidän -rukous**
   - **Päätösylistys ja Herran siunaus**

2. **Päivärukous (*Ad sextam / Seksti*)**:
   - **Johdanto**: *"Jumala, riennä minua auttamaan. Herra, kiirehdi minun avukseni. Kunnia Isälle..."*
   - **Virsi tai laulu**
   - **Keskipäivän psalmi & Antifoni** (*Gloria Patri*)
   - **Raamatunluku**
   - **Hetkirukous ja esirukous** (painike `[📋 Rukoile seurakunnan esirukousaiheiden puolesta]`)
   - **Isä meidän**
   - **Herran siunaus**

3. **Iltarukous (*Vesper*)**:
   - **Johdanto**: *"Jumala, riennä minua auttamaan..."* tai Valon rukous / Valolaulu (*Lucernarium*)
   - **Iltavirsi**
   - **Iltapsalmi(t) & Antifoni** (*Gloria Patri*)
   - **Raamatunluku**
   - **Responsorio / Hiljaisuus**
   - **Marian kiitosvirsi (*Magnificat*)**: *"Minun sieluni ylistää Herran suuruutta, minun henkeni riemuitsee Jumalasta, Vapahtajastani..."*
   - **Yhteinen esirukous**: Sisältää painikkeen `[📋 Rukoile seurakunnan esirukousaiheiden puolesta]` avaten `EmbeddedIntercessionsModal`.
   - **Isä meidän**
   - **Päätösylistys ja Herran siunaus**

4. **Rukous päivän päättyessä (*Kompletorio*)**:
   - **Johdanto**: *"Kallista, Herra, korvasi minun puoleeni ja kuule minua..."*
   - **Synnintunnustus ja anteeksiantamus**: *"Tunnustan sinulle, Jumala, kaikkivaltias..."* ja armonvakuutus.
   - **Yövirsi**
   - **Yöpsalmi** (Ps. 4, 91 tai 134) & Antifoni (*Gloria Patri*)
   - **Raamatunluku**
   - **Responsorio**: *"Sinun käsiisi, Herra, minä uskon henkeni. Sinä lunastat minut, Herra, sinä uskollinen Jumala."*
   - **Simeonin kiitosvirsi (*Nunc Dimittis*)**: *"Herra, nyt sinä sallit palvelijasi lähteä rauhassa, sanasi mukaan..."*
   - **Yörukous**: *"Vieraile, Herra, tässä asunnossa ja aja kauas pois kaikki vihollisen juonet..."*
   - **Isä meidän**
   - **Yösiunaus**: *"Rauhallisen yön ja hyvän lopun suokoon meille kaikkivaltias ja armollinen Herra. Isä, Poika ja Pyhä Henki. Aamen."*

5. **Pieni rukoushetki (*The Small Prayer Moment*)** (*Kirkkokäsikirja III: Pieni rukoushetki*):
   - Helppokäyttöinen, matalan kynnyksen rukoushetki arjen keskelle, työpäivän tauolle, kokouksiin ja retriitteihin.
   - **Alkusiunaus**: *"Isän ja Pojan ja Pyhän Hengen nimeen. Aamen."*
   - **Psalmi tai virsi** & Pieni kunnia (*Gloria Patri*)
   - **Päivän raamatunluku ja hiljainen mietiskely**
   - **Vastaus** (laulu tai musiikki)
   - **Päivän rukousjakso ja esirukous**: Sisältää painikkeen `[📋 Rukoile seurakunnan esirukousaiheiden puolesta]` avaten `EmbeddedIntercessionsModal`.
   - **Isä meidän**
   - **Päätössiunaus**: *"Herra siunatkoon meitä ja varjelkoon meitä..."*

#### Embedded Prayer Intentions Modal (`EmbeddedIntercessionsModal`)
- When praying any of the liturgies, the intercession section contains a prominent action:
  `[📋 Rukoile seurakunnan esirukousaiheiden puolesta]` (*Pray for the parish prayer intentions*).
- Clicking this opens a lightweight modal dialog that loads the approved public prayer intentions and ministry staff focus areas from the Prayer Intentions module.
- Parishioners can read through their own parish's live prayer requests, hold them before God, and then smoothly close the modal to resume the liturgy (Lord's Prayer and Blessing).
- Keeps the user focused inside the liturgical prayer without leaving the page.

### 2.4 Page 4: Curated Devotion (*Hartaus*) (`/hartaus` or `/devotion`)
- **Core Principle: Zero Stress, Pure Serenity**:
  - The reader is never presented with an archive, dropdown, search bar, or multiple options.
  - **Exactly one devotion** is shown: the devotion for today's calendar date.
  - Automatically transitions to the new devotion at **midnight (00:00)** local parish time.
  - If no custom devotion was authored for a specific day, a peaceful liturgical fallback (today's church lectionary scripture, collect prayer, and blessing) is automatically served.
- **Writer Attribution Display**:
  - The writer's name and title are prominently and respectfully displayed right under the title:
    - *Lisääjä itse*: E.g. *"Kirjoittaja: Pastori Maria Korhonen"*
    - *Toisen käyttäjätilin puolesta*: E.g. *"Kirjoittaja: Diakoni Pekka Mäkinen"*. **Note on privacy**: The fact that it was added on behalf of another user is **strictly internal administrative information** and is never displayed publicly. To the reader, only the designated author's name appears.
    - *Vapaamuotoinen kuvaus*: E.g. *"Kirjoittaja: Iäkäs seurakuntalainen"* tai *"Kirjoittaja: Kirkkoisä Augustinus"*
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
1. **Header Navigation**: Navigation links for disabled modules are automatically hidden.
2. **Landing Page Sibling Navigation**: Sibling links on any active page only link to other *enabled* modules.
3. **Routing Fallback & Safeguards**: Navigating directly to a disabled route redirects gracefully to the tenant's first active module.
4. **Tenant Management UI**: Checkbox toggles in `AdminPanel -> General -> TenantManager` and `SettingsManager`.

---

## 4. `Devotion` User Group, Three-Way Author Attribution & Data Model

### 4.1 User Role: `devotion` (*Devotion / Hartauskirjoittaja*)
- Named **`devotion`** so any designated author (pastor, deacon, youth worker, guest writer) can be granted access.
- Added to PostgreSQL enum:
  ```sql
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'devotion';
  ```
- OIDC Group Mapping: Enterprise directory groups (e.g. `sg-devotions`, `sg-hartaus`, `sg-papisto`) automatically map to the `devotion` role.

### 4.2 Three-Way Author Attribution Options
When creating or editing a devotion in `DevotionManager`, the author chooses between three attribution modes:

1. **Option 1: Lisääjä itse (*Current User*) [Default]**:
   - The logged-in user who creates/publishes the devotion is credited as the main author.
   - `author_type = 'self'`
   - `author_user_id = authUser.id`
   - `author_name = authUser.name`
   - `author_title = authUser.title` (e.g. "Pastori")

2. **Option 2: Toisen käyttäjän puolesta (*On Behalf of Another User / OIDC Account*)**:
   - If an assistant, colleague, or team member enters a devotion written by another parish worker or pastor:
   - Selects another registered user account from the parish user list / OIDC directory.
   - **Internal Administrative Metadata Only**: The fact that the devotion was entered on someone else's behalf is **strictly administrative information and is never shown to the public**. To the public reader, the devotion appears cleanly and solely under the designated author's name.
   - In the administrative management UI (`DevotionManager`), administrators and staff see the entry submitter (`created_by_user_id`) alongside the credited author (e.g. *"Kirjoittaja: Pekka Mäkinen • Lisännyt: Maria Korhonen"*) for auditability, accountability, and workflow clarity.
   - `author_type = 'other_user'`
   - `created_by_user_id = authUser.id` (stored for internal admin audit only)
   - `author_user_id = selectedUser.id`
   - `author_name = selectedUser.name`
   - `author_title = selectedUser.title`

3. **Option 3: Vapaamuotoinen kirjoittajatieto (*Freeform Attribution Text*)**:
   - A single free-text field allowing the creator to enter custom attribution without requiring an account in the system:
   - E.g. *"Iäkäs seurakuntalainen"*, *"Kirkkoisä Augustinus"*, *"Eräs seurakuntalainen"*, or *"Tuntematon pyhiinvaeltaja"*.
   - `author_type = 'custom_text'`
   - `created_by_user_id = authUser.id`
   - `author_user_id = NULL`
   - `author_custom_text = 'Iäkäs seurakuntalainen'`
   - `author_name = 'Iäkäs seurakuntalainen'`

### 4.3 Data Model: `devotions` (Hartaudet)
```sql
CREATE TYPE devotion_format AS ENUM ('single_block', 'structured');
CREATE TYPE devotion_author_type AS ENUM ('self', 'other_user', 'custom_text');

CREATE TABLE devotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Creation and Attribution
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_type devotion_author_type NOT NULL DEFAULT 'self',
    author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(255) NOT NULL,
    author_title VARCHAR(255),
    author_custom_text VARCHAR(255),
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
    
    -- Media & audio
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
CREATE INDEX idx_devotions_author_user ON devotions(author_user_id);
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
  ... Rich editor (Single Text Box OR Structured + Author Attribution Selector), Calendar Scheduler ...
```

### 5.1 Domain Breakdown

#### 1. Prayer Intentions (*Esirukoukset*)
- Sub-tabs: `public` queue, `staff` submissions, `pastor` weekly prayer, `bishop` prayer, `highlights`, `cycle-groups` settings, `export` intercession list.

#### 2. Bible Word (*Raamattu & Päivän sana*)
- Sub-tabs: `daily-verse` curation, `translations` (KR92/UT2020), `display` options.

#### 3. Liturgy of Hours (*Hetkirukoukset*)
- Sub-tabs:
  - `liturgies`: Review and configure EVL Kirkkokäsikirja orders (Laudes, Seksti, Vesper, Kompletorio, Pieni rukoushetki).
  - `schedule`: Time boundaries for hours.
  - `lectionary`: Review psalms, antiphons, and canticle texts (*Benedictus, Magnificat, Nunc Dimittis*).
  - `intercessions-sync`: Configure how parish intentions appear in the embedded intercessions modal.

#### 4. Devotions (*Hartaus*) &larr; *Devotion Authoring Hub*
- Sub-tabs:
  - `editor`: **Devotion Composer**:
    - **Author Attribution Control**:
      - Radio 1: *"Minä itse"* (`self`)
      - Radio 2: *"Toisen käyttäjän puolesta"* (`other_user`) &rarr; user picker dropdown
      - Radio 3: *"Vapaa kirjoittajatieto"* (`custom_text`) &rarr; text input (e.g. "Iäkäs seurakuntalainen")
    - **Format Toggle**: Single Text Block (Freeform contiguous text) vs. Structured fields.
    - Target calendar date picker (`target_date`) with midnight activation.
    - Title, scripture text, reflection, prayer, hymn, audio link.
  - `schedule`: Calendar grid overview of scheduled dates.
  - `my-devotions`: List of devotions created by current user.
  - `author-profile`: Personal author signature, title, and optional seal/portrait.

#### 5. General Settings (*Yleiset asetukset*)
- Sub-tabs: `modules` (Tenant active modules manager), `parish` details, `appearance` & color theme, `logos` & crests, `users` management (supporting `devotion` role), `tenants` management.

---

## 6. Technical Implementation Phases

### Phase 1: Database Migration & Backend Services
1. Create migration `017_hartaus_and_tenant_modules.sql`:
   - Add `'devotion'` to `user_role` enum.
   - Create `devotion_format` enum (`'single_block'`, `'structured'`).
   - Create `devotion_author_type` enum (`'self'`, `'other_user'`, `'custom_text'`).
   - Add `active_modules JSONB` column to `tenants` and `site_settings`.
   - Create `devotions` table with unique constraint on `(tenant_id, target_date)` and author attribution columns.
2. Update `annoService.js`:
   - Add authentic Kirkkokäsikirja texts for **Laudes**, **Seksti**, **Vesper**, **Kompletorio**, and **Pieni rukoushetki**.
   - Include versicles, antiphons, *Gloria Patri*, canticles (*Benedictus, Magnificat, Nunc Dimittis*), and confession.
3. Build `devotionService.js` and `devotions.js` routes supporting author resolution.

### Phase 2: Frontend State & Context Architecture
1. Update `TenantContext` & `SettingsContext` with module toggles.
2. Update `AuthContext` to support `isDevotionAuthor` (`role === 'devotion' || role === 'admin'`).

### Phase 3: The Four Landing Pages
1. Implement `LandingHero` reusable header with primary action button and dynamic sibling navigation.
2. Refactor `HomePage.jsx` into dedicated **Prayer Intentions** page.
3. Enhance `BiblePage.jsx` with `DailyVerseModal` and lectionary readings.
4. Implement `PrayerMomentPage.jsx` for **Liturgy of the Hours**:
   - Displays authentic EVL liturgies (Laudes, Seksti, Vesper, Kompletorio, Pieni rukoushetki).
   - "Pray Now" selects the current time-of-day prayer immediately.
   - Integrates `EmbeddedIntercessionsModal` in the intercession section.
5. Implement `DevotionPage.jsx` (*Hartaus*):
   - Strictly shows **one** devotion for today's calendar day with midnight switch and zero decision stress.
   - Clearly displays author's name according to attribution mode.
   - Seamlessly renders single text block or structured format.

### Phase 4: Two-Tier Admin & Devotion Authoring UI
1. Refactor `AdminPanel.jsx` to render Tier 1 domains and Tier 2 sub-tabs.
2. Create `DevotionManager.jsx`:
   - Three-way author attribution selector (Self, Other user, Custom text).
   - Format toggle: Single Text Block vs. Structured fields.
   - Calendar date scheduler.
3. Add module toggle controls into `TenantManager.jsx` and `SettingsManager.jsx`.

### Phase 5: I18n & Quality Assurance
1. Add translation keys across `fi.json`, `en.json`, and `sv.json` for all liturgies, Pieni rukoushetki, Hartaus terms, author attribution options, `devotion` role, and module settings.
2. Run backend tests and verify production frontend build.

---

## 7. Definition of Done

- [ ] Four dedicated landing pages exist: `/` (Prayer Intentions), `/bible` (Bible & Word), `/prayer-moment` (Moment of Prayer), and `/hartaus` (Curated Devotion).
- [ ] Writer's name is always visible on `/hartaus`, supporting all three author options (adding user, designated user account, or freeform text).
- [ ] Liturgy of the Hours follows the official Evangelical Lutheran Church in Finland's *Kirkkokäsikirja* exactly (Laudes, Seksti, Vesper, Kompletorio, and Pieni rukoushetki).
- [ ] In all liturgies, the intercession section features an embedded dialog (`EmbeddedIntercessionsModal`) to view and pray for parish prayer intentions.
- [ ] `/hartaus` strictly renders **only one devotion** for the current calendar day with zero selection choices or stress for the user, switching at midnight.
- [ ] Both single text block (freeform) and structured devotion authoring modes are fully supported.
- [ ] Tenant settings support enabling/disabling any module, cleanly updating navigation, cross-links, and routes.
- [ ] New `devotion` user role enables authors (pastors, workers, guest writers) to compose and schedule devotions.
- [ ] Administrative panel features two-tier hierarchical navigation with full role-based access control.
- [ ] All tests pass and frontend builds with zero warnings or errors.
