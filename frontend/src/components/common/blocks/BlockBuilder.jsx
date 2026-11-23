import { useState } from 'react';
import BlockRenderer from './BlockRenderer';

export const BLOCK_PALETTE = [
  {
    type: 'scripture',
    label: 'Raamatunkohta',
    icon: '📖',
    category: 'Sana & Rukous',
    defaultData: {
      reference: 'Ps. 23:1–2',
      text: 'Herra on minun paimeneni, ei minulta mitään puutu. Hän vie minut vihreille niityille, hän johtaa minut vetten ääreen, siellä saan levätä.',
      translation: 'KR92',
    },
  },
  {
    type: 'reflection',
    label: 'Teksti / Mietiskely / Puhe',
    icon: '📄',
    category: 'Sana & Rukous',
    defaultData: {
      title: 'Mietiskely',
      content: 'Kirjoita tähän hartauden tai meditaation teksti...',
    },
  },
  {
    type: 'prayer',
    label: 'Rukous',
    icon: '🙏',
    category: 'Sana & Rukous',
    defaultData: {
      title: 'Yhteinen rukous',
      content: 'Rakas Taivaallinen Isä, johdata meitä tänään sinun valossasi ja rauhassasi.',
      amen: 'Aamen.',
    },
  },
  {
    type: 'hymn',
    label: 'Virsi tai laulu',
    icon: '🎵',
    category: 'Sana & Rukous',
    defaultData: {
      number: 'Virsi 341',
      title: 'Kiitos sulle, Jumalani',
      verses: '1. Kiitos sulle, Jumalani, armostasi kaikesta...',
      hint: 'Lauletaan tai luetaan yhdessä',
    },
  },
  {
    type: 'blessing',
    label: 'Siunaus',
    icon: '✝️',
    category: 'Sana & Rukous',
    defaultData: {
      title: 'Herran siunaus',
      text: 'Herra siunatkoon meitä ja varjelkoon meitä. Herra kirkastakoon kasvonsa meille ja olkoon meille armollinen. Herra kääntäköön kasvonsa meidän puoleemme ja antakoon meille rauhan. Isän ja Pojan ja Pyhän Hengen nimeen. Aamen.',
    },
  },
  {
    type: 'media_embed',
    label: 'YouTube / Taizé / Ääni',
    icon: '🎬',
    category: 'Sana & Rukous',
    defaultData: {
      mediaType: 'youtube',
      title: 'Meditatiivinen musiikki tai video',
      url: '',
      caption: 'Kuuntele laulua hiljentymisen tukena.',
    },
  },
  {
    type: 'candle_lighting',
    label: 'Interaktiiviset kynttilät (Adventti)',
    icon: '🕯️',
    category: 'Perhe & Liturgia',
    defaultData: {
      title: 'Sytytä adventti- tai rukouskynttilät',
      subtitle: 'Kosketa tai klikkaa kynttilää sytyttääksesi sen!',
      maxCandles: 4,
      initialLitCount: 1,
      interactive: true,
      candleColor: 'white',
      candles: [
        { index: 1, label: '1. Adventti: Toivon kynttilä', verse: 'Olkaa iloiset, sillä Kuninkaanne saapuu!', prayer: 'Rakas Jeesus, tuo valosi pimeän keskelle.' },
        { index: 2, label: '2. Adventti: Rauhan kynttilä', verse: 'Hän tuo rauhan maailmaan.', prayer: 'Anna rauha jokaiseen kotiin.' },
        { index: 3, label: '3. Adventti: Ilon kynttilä', verse: 'Valmistakaa tie Herralle!', prayer: 'Auta meitä jakamaan iloa lähimmäisillemme.' },
        { index: 4, label: '4. Adventti: Rakkauden kynttilä', verse: 'Kunnia Jumalalle korkeuksissa!', prayer: 'Siunaa perheemme ja koko seurakunta. Aamen.' },
      ],
    },
  },
  {
    type: 'children_story',
    label: 'Lasten kertomus & pohdinta',
    icon: '🌟',
    category: 'Perhe & Liturgia',
    defaultData: {
      title: 'Pieni tähti ja kynttilän valo',
      storyText: 'Kauan sitten Betlehemin yllä syttyi kirkas tähti...',
      reflectionQuestion: 'Mikä asia tuo sinulle tänään iloa ja turvallisen mielen?',
      childrenPrayer: 'Rakas Taivaan Isä, kiitos kynttilän lämpimästä valosta. Aamen.',
    },
  },
  {
    type: 'versicle_response',
    label: 'Vuorolauseet (Hetkirukous E:/S:)',
    icon: '🕊️',
    category: 'Perhe & Liturgia',
    defaultData: {
      title: 'Alkusanat (Versiculum)',
      leaderLabel: 'E',
      assemblyLabel: 'S',
      includeGloriaPatri: true,
      pairs: [
        { v: 'Herra, avaa minun huuleni,', r: 'niin suuni julistaa sinun kunniaasi.' },
        { v: 'Jumala, riennä minua auttamaan.', r: 'Herra, kiirehdi minun avukseni.' },
      ],
    },
  },
  {
    type: 'liturgical_psalm',
    label: 'Liturginen psalmi & antifoni',
    icon: '📜',
    category: 'Perhe & Liturgia',
    defaultData: {
      title: 'Hetken psalmi',
      reference: 'Ps. 63:2–5',
      antiphon: 'Ylistetty olkoon Herra, Israelin Jumala!',
      antiphon_abc: 'X:1\nT:Antifoni\nM:C\nL:1/8\nK:C\nG2 A2 B2 c2 | B2 A2 G4 ||\nw:Y-lis-tet-ty ol-koon Her-ra!',
      text: 'Jumala, minun Jumalani, sinua minä etsin varhain.\nSieluni janoaa sinua kuivassa ja vedettömässä maassa.\nNiin minä katselen sinua pyhäkössä,\nnähdäkseni sinun voimasi ja kunniasi.',
      layout: 'indented',
      includeGloriaPatri: true,
    },
  },
  {
    type: 'breathing_timer',
    label: 'Hengitysrytmi & Huokausrukous',
    icon: '🌬️',
    category: 'Meditaatio & Hiljaisuus',
    defaultData: {
      title: 'Hengitys ja sydämen rukous',
      inBreath: 'Herra Jeesus Kristus, Jumalan Poika',
      outBreath: 'Armahda minua syntistä',
      alternativeShort: 'Sisään: "Herra Jeesus" — Ulos: "Armahda"',
      cycleSeconds: 5,
    },
  },
  {
    type: 'silence_timer',
    label: 'Pyhä hiljaisuus & Äänimalja',
    icon: '🔔',
    category: 'Meditaatio & Hiljaisuus',
    defaultData: {
      title: 'Hiljainen rukous ja lepo',
      defaultMinutes: 3,
      chimeType: 'singing_bowl',
      guidingPrompt: 'Lepää hiljaisuudessa Jumalan rakastavan katseen alla.',
    },
  },
  {
    type: 'steps_guide',
    label: 'Vaiheittainen opas (Lectio / Examen)',
    icon: '🪜',
    category: 'Meditaatio & Hiljaisuus',
    defaultData: {
      title: 'Hiljentymisen askeleet',
      layout: 'cards',
      steps: [
        { step: 1, title: '1. Asetu hiljaisuuteen', badge: 'Lectio', guidance: 'Hengitä rauhallisesti ja lue teksti hitaasti.' },
        { step: 2, title: '2. Mietiskele sanaa', badge: 'Meditatio', guidance: 'Kuuntele, mikä sana koskettaa sydäntäsi.' },
        { step: 3, title: '3. Vastaa rukouksella', badge: 'Oratio', guidance: 'Puhu Jumalalle omin sanoin.' },
        { step: 4, title: '4. Lepää Jumalassa', badge: 'Contemplatio', guidance: 'Jää hiljaiseen kiitollisuuteen.' },
      ],
    },
  },
  {
    type: 'bead_sequence',
    label: 'Rukoushelmet / Helminauha',
    icon: '📿',
    category: 'Meditaatio & Hiljaisuus',
    defaultData: {
      title: 'Rukousnauhan helmet',
      beads: [
        {
          index: 1,
          name: 'Jumala-helmi',
          color: 'gold',
          colorName: 'Kultainen',
          shape: 'Suuri kultainen helmi',
          symbolism: 'Jumalan rajaton rakkaus ja läsnäolo.',
          scripture: 'Ps. 139:5',
          prayer: 'Sinä olet rajaton, sinä olet lähellä. Aamen.',
        },
        {
          index: 2,
          name: 'Hiljaisuuden helmi',
          color: 'pearl',
          colorName: 'Helmiäisvalkoinen',
          shape: 'Pitkulainen helmi',
          symbolism: 'Lepo Jumalan kasvojen edessä.',
          scripture: 'Ps. 62:2',
          prayer: 'Herra, anna minulle hiljaisuuden rauha.',
        },
      ],
    },
  },
  {
    type: 'multi_strand',
    label: 'Lutherin 4-säikeinen seppele',
    icon: '🌹',
    category: 'Meditaatio & Hiljaisuus',
    defaultData: {
      title: 'Nelisäikeinen rukousseppele',
      description: 'Kudo sanasta nelisäikeinen seppele Jumalan eteen:',
      strands: [
        { strand: 1, name: '1. Säie: Opiksi', question: 'Mitä Jumala opettaa minulle tässä?', explanation: 'Kuuntele sanaa kuin Jumalan koulussa.' },
        { strand: 2, name: '2. Säie: Kiitokseksi', question: 'Mistä saan kiittää Jumalaa?', explanation: 'Kiitä Jumalan lahjoista ja varjeluksesta.' },
        { strand: 3, name: '3. Säie: Tunnustukseksi', question: 'Missä olen rikkonut tätä vastaan?', explanation: 'Pyydä rehellisesti anteeksi.' },
        { strand: 4, name: '4. Säie: Pyynnöksi', question: 'Mitä pyydän itselleni ja muille?', explanation: 'Rukoile Pyhää Henkeä avuksi.' },
      ],
      examples: [],
    },
  },
];

export default function BlockBuilder({ blocks = [], onChange, title = '' }) {
  const [previewMode, setPreviewMode] = useState('edit'); // 'edit' | 'preview' | 'print'
  const [printLayout, setPrintLayout] = useState('indented'); // 'standard' | 'indented' | 'compact'

  const handleAddBlock = (paletteItem) => {
    const newBlock = {
      id: `${paletteItem.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: paletteItem.type,
      data: JSON.parse(JSON.stringify(paletteItem.defaultData)),
    };
    onChange([...blocks, newBlock]);
  };

  const handleMoveBlock = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    onChange(next);
  };

  const handleRemoveBlock = (index) => {
    const next = blocks.filter((_, i) => i !== index);
    onChange(next);
  };

  const handleUpdateBlockData = (index, patch) => {
    const next = blocks.map((b, i) => {
      if (i !== index) return b;
      return {
        ...b,
        data: {
          ...(b.data || {}),
          ...patch,
        },
      };
    });
    onChange(next);
  };

  const getBlockLabel = (type) => {
    const found = BLOCK_PALETTE.find((p) => p.type === type);
    if (found) return `${found.icon} ${found.label}`;
    return `📦 ${type}`;
  };

  return (
    <div className="space-y-4" data-testid="block-builder">
      {/* Top Toolbar: Mode Switcher (Edit / Interactive Preview / Printable Service Leaflet) */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-100 p-2 rounded-2xl border border-stone-200">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPreviewMode('edit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              previewMode === 'edit'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            🛠️ Muokkaa palikoita ({blocks.length})
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('preview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              previewMode === 'preview'
                ? 'bg-white text-teal-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            👁️ Interaktiivinen esikatselu
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('print')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              previewMode === 'print'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            🖨️ Käsiohjelman tulostusnäkymä
          </button>
        </div>

        {previewMode === 'print' && (
          <div className="flex items-center gap-1.5">
            <select
              value={printLayout}
              onChange={(e) => setPrintLayout(e.target.value)}
              className="text-xs rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-stone-800"
            >
              <option value="indented">⇥ Sisennetty psalmilaulutaitto</option>
              <option value="standard">☰ Tavallinen 1-palstainen</option>
              <option value="compact">📖 Kompakti 2-palstainen käsiohjelma</option>
            </select>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800"
            >
              🖨️ Tulosta
            </button>
          </div>
        )}
      </div>

      {/* PREVIEW OR PRINT VIEW */}
      {previewMode !== 'edit' ? (
        <div
          className={
            previewMode === 'print'
              ? 'p-6 sm:p-8 bg-white border-2 border-stone-300 rounded-2xl shadow-sm space-y-4'
              : 'p-4 sm:p-6 bg-stone-50/70 border border-stone-200 rounded-2xl space-y-4'
          }
        >
          {title && (
            <h3 className="font-martti text-xl font-bold text-stone-900 border-b border-stone-200 pb-2">
              {title}
            </h3>
          )}
          <BlockRenderer
            blocks={blocks}
            printLayout={printLayout}
            isPrint={previewMode === 'print'}
          />
        </div>
      ) : (
        /* EDIT CANVAS */
        <div className="space-y-4">
          {blocks.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-stone-300 rounded-2xl text-stone-500 text-xs sm:text-sm">
              Ei vielä rakennuspalikoita. Valitse alta palikka lisätäksesi sen!
            </div>
          ) : (
            <div className="space-y-3">
              {blocks.map((block, idx) => {
                const data = block.data || {};
                return (
                  <div
                    key={block.id || idx}
                    className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-3"
                  >
                    {/* Block Header Bar */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-100">
                      <span className="font-bold text-xs sm:text-sm text-teal-950">
                        {idx + 1}. {getBlockLabel(block.type)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveBlock(idx, -1)}
                          className="px-2 py-1 text-xs rounded border border-stone-200 hover:bg-stone-100 disabled:opacity-40"
                          title="Siirrä ylös"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={idx === blocks.length - 1}
                          onClick={() => handleMoveBlock(idx, 1)}
                          className="px-2 py-1 text-xs rounded border border-stone-200 hover:bg-stone-100 disabled:opacity-40"
                          title="Siirrä alas"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveBlock(idx)}
                          className="px-2.5 py-1 text-xs rounded border border-rose-200 text-rose-700 hover:bg-rose-50 ml-1"
                          title="Poista palikka"
                        >
                          Poista
                        </button>
                      </div>
                    </div>

                    {/* Block Type Specific Form Inputs */}
                    {(block.type === 'intro' ||
                      block.type === 'intro_markdown' ||
                      block.type === 'reflection' ||
                      block.type === 'meditation') && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Väliotsikko (valinnainen)"
                          value={data.title || ''}
                          onChange={(e) => handleUpdateBlockData(idx, { title: e.target.value })}
                          className="input-field text-xs sm:text-sm"
                        />
                        <textarea
                          rows={4}
                          placeholder="Teksti tai mietiskely..."
                          value={data.content || data.text || ''}
                          onChange={(e) => handleUpdateBlockData(idx, { content: e.target.value })}
                          className="input-field text-xs sm:text-sm font-serif"
                        />
                      </div>
                    )}

                    {(block.type === 'scripture' || block.type === 'scripture_passage') && (
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-stone-600">
                            Raamatunviite (esim. Ps. 23:1–4)
                          </label>
                          <input
                            type="text"
                            value={data.reference || ''}
                            onChange={(e) =>
                              handleUpdateBlockData(idx, { reference: e.target.value })
                            }
                            className="input-field text-xs sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-stone-600">
                            Käännös
                          </label>
                          <select
                            value={data.translation || 'KR92'}
                            onChange={(e) =>
                              handleUpdateBlockData(idx, { translation: e.target.value })
                            }
                            className="input-field text-xs sm:text-sm"
                          >
                            <option value="KR92">KR92</option>
                            <option value="KR38">KR38</option>
                            <option value="UT2020">UT2020</option>
                          </select>
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-[11px] font-semibold text-stone-600">
                            Raamatunteksti
                          </label>
                          <textarea
                            rows={3}
                            value={data.text || ''}
                            onChange={(e) => handleUpdateBlockData(idx, { text: e.target.value })}
                            className="input-field text-xs sm:text-sm font-serif"
                          />
                        </div>
                      </div>
                    )}

                    {block.type === 'prayer' && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Rukouksen otsikko (esim. Päivän rukous)"
                          value={data.title || ''}
                          onChange={(e) => handleUpdateBlockData(idx, { title: e.target.value })}
                          className="input-field text-xs sm:text-sm"
                        />
                        <textarea
                          rows={3}
                          placeholder="Rukousteksti..."
                          value={data.content || ''}
                          onChange={(e) => handleUpdateBlockData(idx, { content: e.target.value })}
                          className="input-field text-xs sm:text-sm font-serif"
                        />
                      </div>
                    )}

                    {(block.type === 'hymn' || block.type === 'hymn_suggestion') && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          placeholder="Virren numero (esim. Virsi 13)"
                          value={data.number || ''}
                          onChange={(e) => handleUpdateBlockData(idx, { number: e.target.value })}
                          className="input-field text-xs sm:text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Virren tai laulun nimi"
                          value={data.title || ''}
                          onChange={(e) => handleUpdateBlockData(idx, { title: e.target.value })}
                          className="input-field text-xs sm:text-sm"
                        />
                        <textarea
                          rows={2}
                          placeholder="Säkeistöt tai laulun sanat (valinnainen)"
                          value={data.verses || ''}
                          onChange={(e) => handleUpdateBlockData(idx, { verses: e.target.value })}
                          className="input-field text-xs sm:text-sm sm:col-span-2 font-serif"
                        />
                      </div>
                    )}

                    {(block.type === 'blessing' || block.type === 'liturgical_blessing') && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Siunauksen otsikko"
                          value={data.title || ''}
                          onChange={(e) => handleUpdateBlockData(idx, { title: e.target.value })}
                          className="input-field text-xs sm:text-sm"
                        />
                        <textarea
                          rows={2}
                          placeholder="Siunauksen sanat..."
                          value={data.text || ''}
                          onChange={(e) => handleUpdateBlockData(idx, { text: e.target.value })}
                          className="input-field text-xs sm:text-sm font-serif"
                        />
                      </div>
                    )}

                    {block.type === 'media_embed' && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          placeholder="Otsikko (esim. Taizé-laulu)"
                          value={data.title || ''}
                          onChange={(e) => handleUpdateBlockData(idx, { title: e.target.value })}
                          className="input-field text-xs sm:text-sm"
                        />
                        <input
                          type="url"
                          placeholder="YouTube- tai äänilinkki (https://...)"
                          value={data.url || ''}
                          onChange={(e) => handleUpdateBlockData(idx, { url: e.target.value })}
                          className="input-field text-xs sm:text-sm"
                        />
                      </div>
                    )}

                    {block.type === 'candle_lighting' && (
                      <div className="space-y-3">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <div>
                            <label className="text-[11px] font-semibold text-stone-600">
                              Kynttilöiden määrä (1–12)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={12}
                              value={data.maxCandles ?? 4}
                              onChange={(e) =>
                                handleUpdateBlockData(idx, {
                                  maxCandles: parseInt(e.target.value, 10) || 4,
                                })
                              }
                              className="input-field text-xs sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-stone-600">
                              Valmiiksi sytytettyjä
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={data.maxCandles || 4}
                              value={data.initialLitCount ?? 1}
                              onChange={(e) =>
                                handleUpdateBlockData(idx, {
                                  initialLitCount: parseInt(e.target.value, 10) || 0,
                                })
                              }
                              className="input-field text-xs sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-stone-600">
                              Kynttilän väri
                            </label>
                            <select
                              value={data.candleColor || 'white'}
                              onChange={(e) =>
                                handleUpdateBlockData(idx, { candleColor: e.target.value })
                              }
                              className="input-field text-xs sm:text-sm"
                            >
                              <option value="white">Valkoinen (Adventti / Juhla)</option>
                              <option value="purple">Violetti (Adventti / Paasto)</option>
                              <option value="gold">Kultainen</option>
                              <option value="red">Punainen</option>
                            </select>
                          </div>
                        </div>
                        <label className="inline-flex items-center gap-2 text-xs text-stone-700">
                          <input
                            type="checkbox"
                            checked={data.interactive !== false}
                            onChange={(e) =>
                              handleUpdateBlockData(idx, { interactive: e.target.checked })
                            }
                          />
                          <span>
                            Käyttäjä/lapsi voi sytyttää ja sammuttaa kynttilöitä klikkaamalla
                          </span>
                        </label>
                      </div>
                    )}

                    {block.type === 'children_story' && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Kertomuksen otsikko"
                          value={data.title || ''}
                          onChange={(e) => handleUpdateBlockData(idx, { title: e.target.value })}
                          className="input-field text-xs sm:text-sm"
                        />
                        <textarea
                          rows={4}
                          placeholder="Kertomuksen teksti..."
                          value={data.storyText || ''}
                          onChange={(e) =>
                            handleUpdateBlockData(idx, { storyText: e.target.value })
                          }
                          className="input-field text-xs sm:text-sm font-serif"
                        />
                        <input
                          type="text"
                          placeholder="Yhteinen pohdintakysymys lapsille"
                          value={data.reflectionQuestion || ''}
                          onChange={(e) =>
                            handleUpdateBlockData(idx, { reflectionQuestion: e.target.value })
                          }
                          className="input-field text-xs sm:text-sm"
                        />
                        <textarea
                          rows={2}
                          placeholder="Lasten rukous..."
                          value={data.childrenPrayer || ''}
                          onChange={(e) =>
                            handleUpdateBlockData(idx, { childrenPrayer: e.target.value })
                          }
                          className="input-field text-xs sm:text-sm font-serif"
                        />
                      </div>
                    )}

                    {block.type === 'versicle_response' && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Otsikko (esim. Alkusanat)"
                          value={data.title || ''}
                          onChange={(e) => handleUpdateBlockData(idx, { title: e.target.value })}
                          className="input-field text-xs sm:text-sm"
                        />
                        {(data.pairs || []).map((pair, pIdx) => (
                          <div key={pIdx} className="grid gap-2 sm:grid-cols-2">
                            <input
                              type="text"
                              placeholder="E: Esilukijan vuorosana"
                              value={pair.v || ''}
                              onChange={(e) => {
                                const nextPairs = [...(data.pairs || [])];
                                nextPairs[pIdx] = { ...nextPairs[pIdx], v: e.target.value };
                                handleUpdateBlockData(idx, { pairs: nextPairs });
                              }}
                              className="input-field text-xs"
                            />
                            <input
                              type="text"
                              placeholder="S: Seurakunnan vastaus"
                              value={pair.r || ''}
                              onChange={(e) => {
                                const nextPairs = [...(data.pairs || [])];
                                nextPairs[pIdx] = { ...nextPairs[pIdx], r: e.target.value };
                                handleUpdateBlockData(idx, { pairs: nextPairs });
                              }}
                              className="input-field text-xs"
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateBlockData(idx, {
                              pairs: [...(data.pairs || []), { v: '', r: '' }],
                            })
                          }
                          className="text-xs text-teal-800 font-semibold hover:underline"
                        >
                          + Lisää vuoropari (E: / S:)
                        </button>
                      </div>
                    )}

                    {(block.type === 'liturgical_psalm' || block.type === 'canticle') && (
                      <div className="space-y-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            type="text"
                            placeholder="Psalmin viite (esim. Ps. 63:2–9)"
                            value={data.reference || ''}
                            onChange={(e) =>
                              handleUpdateBlockData(idx, { reference: e.target.value })
                            }
                            className="input-field text-xs sm:text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Antifoni (kertosäe)"
                            value={data.antiphon || ''}
                            onChange={(e) =>
                              handleUpdateBlockData(idx, { antiphon: e.target.value })
                            }
                            className="input-field text-xs sm:text-sm"
                          />
                        </div>
                        <textarea
                          rows={4}
                          placeholder="Psalmin säkeistöt (jokainen rivi omalle rivilleen; sisennetty laulutaitto sisentää parilliset rivit)"
                          value={data.text || ''}
                          onChange={(e) => handleUpdateBlockData(idx, { text: e.target.value })}
                          className="input-field text-xs sm:text-sm font-serif"
                        />
                        <textarea
                          rows={2}
                          placeholder="ABC-nuottikoodi antifonille (valinnainen, esim. X:1 ...)"
                          value={data.antiphon_abc || ''}
                          onChange={(e) =>
                            handleUpdateBlockData(idx, { antiphon_abc: e.target.value })
                          }
                          className="input-field text-xs font-mono"
                        />
                      </div>
                    )}

                    {block.type === 'breathing_timer' && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          placeholder="Sisäänhengityksen rukouslause"
                          value={data.inBreath || ''}
                          onChange={(e) => handleUpdateBlockData(idx, { inBreath: e.target.value })}
                          className="input-field text-xs sm:text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Uloshengityksen rukouslause"
                          value={data.outBreath || ''}
                          onChange={(e) =>
                            handleUpdateBlockData(idx, { outBreath: e.target.value })
                          }
                          className="input-field text-xs sm:text-sm"
                        />
                      </div>
                    )}

                    {(block.type === 'silence_timer' || block.type === 'timer_silence') && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="text-[11px] font-semibold text-stone-600">
                            Oletuskesto (minuuttia)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={data.defaultMinutes ?? 3}
                            onChange={(e) =>
                              handleUpdateBlockData(idx, {
                                defaultMinutes: parseInt(e.target.value, 10) || 3,
                              })
                            }
                            className="input-field text-xs sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-stone-600">
                            Hiljaisuuden ohjeteksti
                          </label>
                          <input
                            type="text"
                            value={data.guidingPrompt || ''}
                            onChange={(e) =>
                              handleUpdateBlockData(idx, { guidingPrompt: e.target.value })
                            }
                            className="input-field text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {block.type === 'steps_guide' && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Vaiheoppaan otsikko"
                          value={data.title || ''}
                          onChange={(e) => handleUpdateBlockData(idx, { title: e.target.value })}
                          className="input-field text-xs sm:text-sm"
                        />
                        {(data.steps || []).map((st, sIdx) => (
                          <div key={sIdx} className="grid gap-2 sm:grid-cols-3 bg-stone-50 p-2 rounded-xl">
                            <input
                              type="text"
                              placeholder="Vaiheen nimi"
                              value={st.title || st.name || ''}
                              onChange={(e) => {
                                const nextSteps = [...(data.steps || [])];
                                nextSteps[sIdx] = {
                                  ...nextSteps[sIdx],
                                  title: e.target.value,
                                  name: e.target.value,
                                };
                                handleUpdateBlockData(idx, { steps: nextSteps });
                              }}
                              className="input-field text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Ohjeistus..."
                              value={st.guidance || st.desc || ''}
                              onChange={(e) => {
                                const nextSteps = [...(data.steps || [])];
                                nextSteps[sIdx] = {
                                  ...nextSteps[sIdx],
                                  guidance: e.target.value,
                                  desc: e.target.value,
                                };
                                handleUpdateBlockData(idx, { steps: nextSteps });
                              }}
                              className="input-field text-xs sm:col-span-2"
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateBlockData(idx, {
                              steps: [
                                ...(data.steps || []),
                                {
                                  step: (data.steps?.length || 0) + 1,
                                  title: `${(data.steps?.length || 0) + 1}. Vaihe`,
                                  guidance: '',
                                },
                              ],
                            })
                          }
                          className="text-xs text-teal-800 font-semibold hover:underline"
                        >
                          + Lisää vaihe
                        </button>
                      </div>
                    )}

                    {block.type === 'bead_sequence' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-stone-700">
                            Helmiä sarjassa: {(data.beads || []).length} kpl
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBlockData(idx, {
                                beads: [
                                  ...(data.beads || []),
                                  {
                                    index: (data.beads?.length || 0) + 1,
                                    name: 'Uusi helmi',
                                    color: 'pearl',
                                    colorName: 'Helmiäinen',
                                    symbolism: '',
                                    scripture: '',
                                    prayer: '',
                                  },
                                ],
                              })
                            }
                            className="text-xs text-teal-800 font-semibold hover:underline"
                          >
                            + Lisää helmi
                          </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                          {(data.beads || []).map((bead, bIdx) => (
                            <div
                              key={bIdx}
                              className="grid gap-1.5 sm:grid-cols-3 bg-stone-50 p-2 rounded-xl text-xs"
                            >
                              <input
                                type="text"
                                placeholder="Helmen nimi"
                                value={bead.name || ''}
                                onChange={(e) => {
                                  const nextBeads = [...(data.beads || [])];
                                  nextBeads[bIdx] = { ...nextBeads[bIdx], name: e.target.value };
                                  handleUpdateBlockData(idx, { beads: nextBeads });
                                }}
                                className="input-field text-xs"
                              />
                              <select
                                value={bead.color || 'pearl'}
                                onChange={(e) => {
                                  const nextBeads = [...(data.beads || [])];
                                  nextBeads[bIdx] = { ...nextBeads[bIdx], color: e.target.value };
                                  handleUpdateBlockData(idx, { beads: nextBeads });
                                }}
                                className="input-field text-xs"
                              >
                                <option value="gold">Kultainen</option>
                                <option value="pearl">Helmiäinen</option>
                                <option value="white">Valkoinen</option>
                                <option value="sand">Hiekanruskea</option>
                                <option value="blue">Taivaansininen</option>
                                <option value="red">Syvänpunainen</option>
                                <option value="black">Musta</option>
                                <option value="yellow">Keltainen</option>
                                <option value="green">Vihreä</option>
                                <option value="purple">Violetti</option>
                              </select>
                              <input
                                type="text"
                                placeholder="Helmen rukous"
                                value={bead.prayer || ''}
                                onChange={(e) => {
                                  const nextBeads = [...(data.beads || [])];
                                  nextBeads[bIdx] = { ...nextBeads[bIdx], prayer: e.target.value };
                                  handleUpdateBlockData(idx, { beads: nextBeads });
                                }}
                                className="input-field text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Block Palette */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/90 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
              + Lisää rakennuspalikka
            </span>
            <div className="flex flex-wrap gap-1.5">
              {BLOCK_PALETTE.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleAddBlock(item)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50 border border-stone-200 hover:border-teal-300 text-xs font-medium text-stone-800 flex items-center gap-1.5 shadow-2xs transition-all"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
