import { query } from '../db/index.js';
import {
  collectPrayerSections,
  computeDueMailings,
  deliverViaTunnus,
  getRecipients,
  helsinkiParts,
  isMailingConfigured,
  loadEnabledMailings,
  loadMailingContent,
  loadSentKeys,
  renderMailing,
} from './mailingService.js';

export const MAILING_TICK_MS = 10 * 60 * 1000;
export const MAILING_CONCURRENCY = 5;

/** Runs `fn` over `items` with at most `limit` calls in flight. */
export async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Claims (mailing, date) with an INSERT; returns the send id, or null when another run already claimed it. */
async function claimSend(mailingId, sendDate) {
  const res = await query(
    `INSERT INTO mailing_sends (mailing_id, send_date, status)
     VALUES ($1, $2, 'sending')
     ON CONFLICT (mailing_id, send_date) DO NOTHING
     RETURNING id`,
    [mailingId, sendDate]
  );
  return res.rows[0]?.id ?? null;
}

async function finishSend(sendId, status, recipients, failed) {
  await query(
    `UPDATE mailing_sends SET status = $2, recipients = $3, failed = $4, finished_at = NOW()
     WHERE id = $1`,
    [sendId, status, recipients, failed]
  );
}

/**
 * Sends one due mailing for one date. Logs ids and counts only, never addresses.
 * @returns {Promise<'sent' | 'failed' | 'skipped' | null>} null when the claim was already taken
 */
export async function sendScheduledMailing(mailing, sendDate) {
  const sendId = await claimSend(mailing.id, sendDate);
  if (!sendId) return null;

  if (!mailing.tenant_id) {
    await finishSend(sendId, 'skipped', 0, 0);
    console.log(`Mailing ${mailing.id}: skipped for ${sendDate}, no tenant`);
    return 'skipped';
  }

  try {
    const content = await loadMailingContent(mailing, sendDate);
    const hasPrayers = collectPrayerSections(content.prayers, mailing.include_public).length > 0;
    const recipients = await getRecipients(mailing);

    if (!hasPrayers || recipients.length === 0) {
      await finishSend(sendId, 'skipped', 0, 0);
      console.log(`Mailing ${mailing.id}: skipped for ${sendDate} (prayers: ${hasPrayers}, recipients: ${recipients.length})`);
      return 'skipped';
    }

    let failed = 0;
    await mapWithConcurrency(recipients, MAILING_CONCURRENCY, async (recipient) => {
      const rendered = renderMailing({
        ...content,
        subject: mailing.subject,
        includePublic: mailing.include_public,
        unsubscribeUrl: recipient.unsubscribeUrl,
      });
      try {
        await deliverViaTunnus({
          to: recipient.email,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        });
      } catch (err) {
        failed += 1;
        console.error(`Mailing ${mailing.id}: delivery failed for recipient ${recipient.id}: ${err.message}`);
      }
    });

    const status = failed > 0 ? 'failed' : 'sent';
    await finishSend(sendId, status, recipients.length, failed);
    console.log(`Mailing ${mailing.id}: ${status} for ${sendDate} (recipients ${recipients.length}, failed ${failed})`);
    return status;
  } catch (err) {
    await finishSend(sendId, 'failed', 0, 0).catch(() => {});
    console.error(`Mailing ${mailing.id}: send for ${sendDate} failed: ${err.message}`);
    return 'failed';
  }
}

/** One scheduler pass: find due mailings for today (Helsinki) and send them. */
export async function runMailingTick(now = new Date()) {
  const today = helsinkiParts(now).date;
  const [mailings, sentKeys] = await Promise.all([loadEnabledMailings(), loadSentKeys(today)]);
  const due = computeDueMailings(now, mailings, sentKeys);
  const results = [];
  for (const { mailing, sendDate } of due) {
    results.push(await sendScheduledMailing(mailing, sendDate));
  }
  return results;
}

/**
 * Starts the periodic scheduler. Does nothing (returns null) when MAILING_SCHEDULER=false
 * or when the mail relay settings are missing.
 * @returns {{ stop: () => void } | null}
 */
export function startMailingScheduler(env = process.env) {
  if (env.MAILING_SCHEDULER === 'false') {
    console.log('Mailing scheduler disabled (MAILING_SCHEDULER=false)');
    return null;
  }
  if (!isMailingConfigured(env)) {
    console.log('Mailing disabled: TUNNUS_MAIL_URL, TUNNUS_MAIL_RELAY_TOKEN or MAIL_FROM is not set');
    return null;
  }

  const tick = () => {
    runMailingTick().catch(err => console.error(`Mailing scheduler tick failed: ${err.message}`));
  };
  const timer = setInterval(tick, MAILING_TICK_MS);
  tick();
  console.log(`Mailing scheduler started (every ${MAILING_TICK_MS / 60000} minutes)`);
  return { stop: () => clearInterval(timer) };
}
