import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

function getYouTubeEmbedId(url) {
  if (!url || typeof url !== 'string') return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export default function DevotionManager() {
  const { t } = useTranslation();
  const { user, isAdmin, isCoordinator } = useAuth();

  const [devotions, setDevotions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form state
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const emptyForm = {
    id: null,
    target_date: getTodayDate(),
    title: '',
    format: 'single_block',
    author_type: 'self',
    author_user_id: '',
    author_custom_name: '',
    content: '',
    scripture_reference: '',
    scripture_text: '',
    meditation: '',
    prayer: '',
    hymn: '',
    blessing: '',
    youtube_url: '',
    pieces_order: ['scripture', 'meditation', 'prayer', 'hymn'],
    status: 'published',
  };

  const [formData, setFormData] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const devRes = await api.listDevotions();
      setDevotions(devRes?.devotions || []);

      if (isAdmin || isCoordinator) {
        try {
          const userRes = await api.getUsers();
          setUsers(userRes?.users || []);
        } catch (uErr) {
          console.warn('Could not fetch user list for devotion author attribution:', uErr);
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Hartaustietojen lataus epäonnistui' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartCreate = () => {
    setFormData(emptyForm);
    setIsEditing(true);
    setFeedback(null);
  };

  const handleStartEdit = (item) => {
    let order = ['scripture', 'meditation', 'prayer', 'hymn'];
    if (item.pieces_order) {
      try {
        order = typeof item.pieces_order === 'string' ? JSON.parse(item.pieces_order) : item.pieces_order;
        if (!Array.isArray(order) || order.length === 0) {
          order = ['scripture', 'meditation', 'prayer', 'hymn'];
        }
      } catch (e) {
        order = ['scripture', 'meditation', 'prayer', 'hymn'];
      }
    }
    setFormData({
      id: item.id,
      target_date: item.target_date ? item.target_date.split('T')[0] : getTodayDate(),
      title: item.title || '',
      format: item.format || 'single_block',
      author_type: item.author_type || 'self',
      author_user_id: item.author_user_id || '',
      author_custom_name: item.author_custom_name || '',
      content: item.content || '',
      scripture_reference: item.scripture_reference || '',
      scripture_text: item.scripture_text || '',
      meditation: item.meditation || item.meditation_content || '',
      prayer: item.prayer || item.closing_prayer || '',
      hymn: item.hymn || item.hymn_suggestion || '',
      blessing: item.blessing || '',
      youtube_url: item.youtube_url || '',
      pieces_order: order,
      status: item.is_published === false || item.status === 'draft' ? 'draft' : 'published',
    });
    setIsEditing(true);
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setFeedback(null);
  };

  const handleMovePiece = (index, direction) => {
    const newOrder = [...formData.pieces_order];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    setFormData((prev) => ({ ...prev, pieces_order: newOrder }));
  };

  const handleToggleStatus = async (item) => {
    const isCurrentlyPublished = item.status === 'published' || item.is_published === true;
    const newStatus = isCurrentlyPublished ? 'draft' : 'published';
    try {
      await api.saveDevotion({
        ...item,
        status: newStatus,
        is_published: !isCurrentlyPublished,
      });
      setFeedback({
        type: 'success',
        text: `Hartauden (${item.target_date?.split('T')[0]}) tila vaihdettu: ${newStatus === 'published' ? 'Julkaistu' : 'Luonnos'}`,
      });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Tilan vaihto epäonnistui' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        id: formData.id,
        target_date: formData.target_date,
        title: formData.title.trim(),
        format: formData.format,
        author_type: formData.author_type,
        author_user_id: formData.author_type === 'other_user' ? formData.author_user_id : null,
        author_custom_name: formData.author_type === 'custom_text' ? formData.author_custom_name.trim() : null,
        status: formData.status,
        is_published: formData.status === 'published',
        youtube_url: formData.youtube_url ? formData.youtube_url.trim() : null,
      };

      if (formData.format === 'single_block') {
        payload.content = formData.content;
      } else {
        payload.scripture_reference = formData.scripture_reference;
        payload.scripture_text = formData.scripture_text;
        payload.meditation = formData.meditation;
        payload.meditation_content = formData.meditation;
        payload.prayer = formData.prayer;
        payload.closing_prayer = formData.prayer;
        payload.hymn = formData.hymn;
        payload.hymn_suggestion = formData.hymn;
        payload.blessing = formData.blessing;
        payload.pieces_order = formData.pieces_order;
      }

      await api.saveDevotion(payload);
      setFeedback({
        type: 'success',
        text: formData.id ? 'Hartaus päivitetty onnistuneesti!' : 'Uusi hartaus tallennettu onnistuneesti!',
      });
      setIsEditing(false);
      setFormData(emptyForm);
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Hartauden tallennus epäonnistui' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, targetDate) => {
    if (!window.confirm(`Haluatko varmasti poistaa päivän ${targetDate} hartauden?`)) {
      return;
    }

    try {
      await api.deleteDevotion(id);
      setFeedback({ type: 'success', text: 'Hartaus poistettu.' });
      if (formData.id === id) {
        setIsEditing(false);
        setFormData(emptyForm);
      }
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Poisto epäonnistui' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and overview */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-teal-50 to-primary-50 p-4 sm:p-5 rounded-2xl border border-teal-200/80 shadow-sm">
        <div>
          <h2 className="font-martti text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>✍️</span> Päivän hartaudet (Hartauskirjoittaminen)
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Laadi ja ajasta seurakunnan päivittäisiä hartauksia. Jokaiselle kalenteripäivälle on yksi hartaus, joka vaihtuu automaattisesti keskiyöllä (00:00).
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={handleStartCreate}
            className="btn-primary self-start sm:self-auto shrink-0 flex items-center gap-2"
          >
            <span>➕</span>
            <span>Uusi hartaus</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Editor Form */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="card border-2 border-teal-400/40 space-y-6 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="font-martti font-bold text-base text-gray-900 flex items-center gap-2">
              <span>{formData.id ? '📝 Muokkaa hartautta' : '✍️ Uusi päivän hartaus'}</span>
            </h3>
            <span className="text-xs text-gray-500 font-mono">
              Kalenteripäivä: {formData.target_date}
            </span>
          </div>

          {/* Date, Title, Status */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label text-xs font-semibold">Julkaisupäivämäärä *</label>
              <input
                type="date"
                required
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                className="input text-sm"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Näytetään kävijöille koko tämän vuorokauden ajan (00:00 - 23:59).
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="label text-xs font-semibold">Hartauden otsikko *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input text-sm"
                placeholder="esim. Valo pimeydessä tai Matkalla kotiin"
              />
            </div>
          </div>

          {/* Author attribution section (The 3 Options requested by User) */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="label text-xs font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5 mb-0">
                <span>👤</span> Kirjoittajan merkintä (Tekijätieto)
              </label>
              <span className="text-[11px] text-gray-500">Valitse yksi kolmesta tavasta</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <label
                className={`p-3 rounded-lg border cursor-pointer text-xs transition-colors flex items-start gap-2.5 ${
                  formData.author_type === 'self'
                    ? 'border-teal-600 bg-teal-50/80 text-teal-950 font-semibold'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="author_type"
                  checked={formData.author_type === 'self'}
                  onChange={() => setFormData({ ...formData, author_type: 'self' })}
                  className="mt-0.5 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <div className="font-semibold">Oma nimeni</div>
                  <div className="text-[11px] font-normal text-gray-500 mt-0.5">
                    {user?.name || 'Kirjautunut käyttäjä'}
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer text-xs transition-colors flex items-start gap-2.5 ${
                  formData.author_type === 'other_user'
                    ? 'border-teal-600 bg-teal-50/80 text-teal-950 font-semibold'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="author_type"
                  checked={formData.author_type === 'other_user'}
                  onChange={() => setFormData({ ...formData, author_type: 'other_user' })}
                  className="mt-0.5 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <div className="font-semibold">Toisen käyttäjän puolesta</div>
                  <div className="text-[11px] font-normal text-gray-500 mt-0.5">
                    Valitse seurakunnan OIDC-käyttäjä
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer text-xs transition-colors flex items-start gap-2.5 ${
                  formData.author_type === 'custom_text'
                    ? 'border-teal-600 bg-teal-50/80 text-teal-950 font-semibold'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="author_type"
                  checked={formData.author_type === 'custom_text'}
                  onChange={() => setFormData({ ...formData, author_type: 'custom_text' })}
                  className="mt-0.5 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <div className="font-semibold">Vapaa tekijäkuvaus</div>
                  <div className="text-[11px] font-normal text-gray-500 mt-0.5">
                    Vieras, seurakuntalainen tms.
                  </div>
                </div>
              </label>
            </div>

            {formData.author_type === 'other_user' && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-teal-200">
                <label className="label text-xs font-semibold">Valitse kirjoittaja käyttäjäluettelosta *</label>
                <select
                  value={formData.author_user_id}
                  onChange={(e) => setFormData({ ...formData, author_user_id: e.target.value })}
                  className="input text-sm"
                  required={formData.author_type === 'other_user'}
                >
                  <option value="">-- Valitse käyttäjä --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email || u.role})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-teal-800 bg-teal-50/70 p-2 rounded mt-2 border border-teal-100">
                  ℹ️ <strong>Huom:</strong> Julkisella hartaus-sivulla näytetään ainoastaan valitun käyttäjän nimi. Tieto siitä, että sinä tallensit tekstin toisen puolesta, jää järjestelmän sisäiseen auditointiin eikä näy ulkopuolisille.
                </p>
              </div>
            )}

            {formData.author_type === 'custom_text' && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-teal-200">
                <label className="label text-xs font-semibold">Kirjoittajan kuvaus tai nimi *</label>
                <input
                  type="text"
                  required={formData.author_type === 'custom_text'}
                  value={formData.author_custom_name}
                  onChange={(e) => setFormData({ ...formData, author_custom_name: e.target.value })}
                  className="input text-sm"
                  placeholder="esim. Iäkäs seurakuntalainen, Vieraileva saarnaaja tai Seurakunnan nuoret"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Tämä teksti tulostuu sellaisenaan hartauden kirjoittajan nimen kohdalle.
                </p>
              </div>
            )}
          </div>

          {/* YouTube Video URL Input with Live Preview */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <label className="label text-xs font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5 mb-0">
              <span>▶️</span> YouTube-video (valinnainen)
            </label>
            <p className="text-[11px] text-gray-500">
              Liitä tähän YouTube-videon tai Shorts-videon linkki. Video näytetään responsiivisena soittimena hartauden alussa.
            </p>
            <input
              type="url"
              value={formData.youtube_url}
              onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
              className="input text-sm"
              placeholder="esim. https://www.youtube.com/watch?v=... tai https://youtu.be/..."
            />
            {formData.youtube_url && (
              <div className="pt-2">
                {getYouTubeEmbedId(formData.youtube_url) ? (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                      <span>✓</span> Videon esikatselu:
                    </span>
                    <div className="max-w-md aspect-video rounded-xl overflow-hidden border border-gray-300 bg-black shadow-2xs">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${getYouTubeEmbedId(formData.youtube_url)}`}
                        title="Videon esikatselu"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-rose-600 font-medium">
                    ⚠️ Linkki ei vaikuta kelvolliselta YouTube-osoitteelta.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Format selection: Single Text Block vs Structured */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="label text-xs font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5 mb-0">
                <span>📑</span> Hartauden rakenne ja muoto
              </label>
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, format: 'single_block' })}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    formData.format === 'single_block'
                      ? 'bg-white shadow-sm text-teal-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Yhtenäinen tekstikenttä
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, format: 'structured' })}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    formData.format === 'structured'
                      ? 'bg-white shadow-sm text-teal-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Jäsennelty rakenne
                </button>
              </div>
            </div>

            {formData.format === 'single_block' ? (
              <div>
                <label className="label text-xs">Hartausteksti *</label>
                <textarea
                  rows={12}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="input font-serif text-sm leading-relaxed"
                  placeholder="Kirjoita tai liitä koko päivän hartaus tähän. Voit sisällyttää raamatunlauseet, ajatukset ja rukouksen samaan tekstiin vapaamuotoisesti..."
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Käytä kappalejakoja selkeän lukukokemuksen luomiseksi.
                </p>
              </div>
            ) : (
              <div className="space-y-4 p-4 bg-teal-50/40 rounded-xl border border-teal-200/60">
                <div className="flex items-center justify-between pb-2 border-b border-teal-200/60">
                  <span className="text-xs font-bold text-teal-950 uppercase tracking-wide">
                    Hartauden osiot (Järjestä ja muokkaa)
                  </span>
                  <span className="text-[11px] text-teal-800">
                    Käytä ▲/▼ -painikkeita osioiden järjestyksen vaihtamiseen
                  </span>
                </div>

                <div className="space-y-3">
                  {formData.pieces_order.map((pieceKey, index) => {
                    const isFirst = index === 0;
                    const isLast = index === formData.pieces_order.length - 1;

                    return (
                      <div
                        key={pieceKey}
                        className="p-3.5 bg-white rounded-xl border border-teal-200/80 shadow-2xs space-y-2.5 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-900 flex items-center justify-center text-[11px] font-mono">
                              {index + 1}
                            </span>
                            <span>
                              {pieceKey === 'scripture' && '📖 Raamatunkohta ja lukuteksti'}
                              {pieceKey === 'meditation' && '✍️ Meditaatio / Hartauspuhe'}
                              {pieceKey === 'prayer' && '🙏 Päivän rukous'}
                              {pieceKey === 'hymn' && '🎵 Ehdotettu virsi tai musiikki'}
                            </span>
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => handleMovePiece(index, -1)}
                              className="px-2 py-0.5 text-xs font-bold rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none"
                              title="Siirrä ylöspäin"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => handleMovePiece(index, 1)}
                              className="px-2 py-0.5 text-xs font-bold rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none"
                              title="Siirrä alaspäin"
                            >
                              ▼
                            </button>
                          </div>
                        </div>

                        {pieceKey === 'scripture' && (
                          <div className="space-y-2 pt-1">
                            <input
                              type="text"
                              value={formData.scripture_reference}
                              onChange={(e) => setFormData({ ...formData, scripture_reference: e.target.value })}
                              className="input text-xs"
                              placeholder="Raamatunkohta (viite, esim. Matt. 5:14-16 tai Ps. 23) - jätä tyhjäksi ohittaaksesi"
                            />
                            <textarea
                              rows={3}
                              value={formData.scripture_text}
                              onChange={(e) => setFormData({ ...formData, scripture_text: e.target.value })}
                              className="input text-xs italic"
                              placeholder="Lainaus raamatunkohdasta..."
                            />
                          </div>
                        )}

                        {pieceKey === 'meditation' && (
                          <div className="pt-1">
                            <textarea
                              rows={5}
                              value={formData.meditation}
                              onChange={(e) => setFormData({ ...formData, meditation: e.target.value })}
                              className="input font-serif text-xs leading-relaxed"
                              placeholder="Kirjoittajan pohdinta ja rohkaisun sanat..."
                            />
                          </div>
                        )}

                        {pieceKey === 'prayer' && (
                          <div className="pt-1">
                            <textarea
                              rows={3}
                              value={formData.prayer}
                              onChange={(e) => setFormData({ ...formData, prayer: e.target.value })}
                              className="input text-xs italic"
                              placeholder="Yhteinen rukous tälle päivälle..."
                            />
                          </div>
                        )}

                        {pieceKey === 'hymn' && (
                          <div className="pt-1">
                            <input
                              type="text"
                              value={formData.hymn}
                              onChange={(e) => setFormData({ ...formData, hymn: e.target.value })}
                              className="input text-xs"
                              placeholder="esim. Virsi 338: Päivä vain ja hetki kerrallansa"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions (Responsive without overflow) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-gray-100 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="label text-xs font-semibold mb-0 whitespace-nowrap">Tila:</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input py-1.5 text-xs w-auto"
              >
                <option value="published">Julkaistu (näkyy kalenteripäivänään)</option>
                <option value="draft">Luonnos (vain ylläpidolle)</option>
              </select>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={handleCancel}
                className="btn-secondary text-xs sm:text-sm py-2 px-4"
              >
                Peruuta
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary text-xs sm:text-sm py-2 px-5 flex items-center gap-2 whitespace-nowrap"
              >
                {saving ? 'Tallennetaan...' : formData.id ? 'Tallenna muutokset' : 'Julkaise hartaus'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* List of Scheduled / Past Devotions */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h3 className="font-martti font-bold text-base text-gray-900">
              Seurakunnan hartaudet ({devotions.length})
            </h3>
            <p className="text-xs text-gray-500">
              Järjestetty päivämäärän mukaan. Tänään voimassa oleva hartaus on korostettu.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500 text-sm">Ladataan hartauksia...</div>
        ) : devotions.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500 text-sm">
            Ei vielä tallennettuja hartauksia. Luo ensimmäinen hartaus painamalla yltä &quot;Uusi hartaus&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-medium">
                  <th className="py-2.5 px-3">Päivä</th>
                  <th className="py-2.5 px-3">Otsikko</th>
                  <th className="py-2.5 px-3">Muoto</th>
                  <th className="py-2.5 px-3">Tekijätieto (Julkinen)</th>
                  <th className="py-2.5 px-3">Tallentaja (Sisäinen audit)</th>
                  <th className="py-2.5 px-3">Tila</th>
                  <th className="py-2.5 px-3 text-right">Toiminnot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {devotions.map((dev) => {
                  const dateStr = dev.target_date ? dev.target_date.split('T')[0] : '';
                  const isToday = dateStr === getTodayDate();

                  let publicAuthor = dev.author_name;
                  if (dev.author_type === 'custom_text') {
                    publicAuthor = dev.author_custom_name || 'Vapaa kuvaus';
                  }

                  return (
                    <tr
                      key={dev.id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isToday ? 'bg-teal-50/60 font-medium' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono whitespace-nowrap">
                        {dateStr}
                        {isToday && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-200 text-teal-900 uppercase">
                            Tänään
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-gray-900 max-w-xs truncate">
                        {dev.title}
                      </td>
                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                        {dev.format === 'single_block' ? 'Yhtenäinen teksti' : 'Jäsennelty'}
                      </td>
                      <td className="py-3 px-3 text-gray-800 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <span>{dev.author_type === 'custom_text' ? '📝' : '👤'}</span>
                          <span>{publicAuthor || 'Tuntematon'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-500 text-xs whitespace-nowrap">
                        {dev.created_by_name ? (
                          <span title={`Tallennettu toisen puolesta tai suoraan ID:llä ${dev.created_by_user_id}`}>
                            {dev.created_by_name}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(dev)}
                          title="Klikkaa vaihtaaksesi tilan (Julkaistu / Luonnos)"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                            dev.status === 'published' || dev.is_published === true
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                          }`}
                        >
                          <span>{dev.status === 'published' || dev.is_published === true ? '✓' : '⏸'}</span>
                          <span>{dev.status === 'published' || dev.is_published === true ? 'Julkaistu' : 'Luonnos'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => handleStartEdit(dev)}
                          className="text-primary-700 hover:text-primary-900 font-medium text-xs p-1"
                        >
                          Muokkaa
                        </button>
                        <button
                          onClick={() => handleDelete(dev.id, dateStr)}
                          className="text-rose-600 hover:text-rose-800 font-medium text-xs p-1"
                        >
                          Poista
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
