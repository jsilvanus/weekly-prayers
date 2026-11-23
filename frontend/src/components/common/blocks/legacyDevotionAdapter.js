/**
 * Converts a legacy meditation or devotion object into a standard array of building blocks
 * if `item.blocks` is missing or empty.
 */

export function ensureMeditationBlocks(meditation) {
  if (!meditation) return [];
  if (Array.isArray(meditation.blocks) && meditation.blocks.length > 0) {
    return meditation.blocks;
  }

  const blocks = [];

  if (Array.isArray(meditation.beads) && meditation.beads.length > 0) {
    blocks.push({
      id: `${meditation.id || 'med'}-beads`,
      type: 'bead_sequence',
      data: {
        title: `Rukousnauhan ${meditation.beads.length} helmeä`,
        beads: meditation.beads,
      },
    });
  }

  if (Array.isArray(meditation.strands) && meditation.strands.length > 0) {
    blocks.push({
      id: `${meditation.id || 'med'}-strands`,
      type: 'multi_strand',
      data: {
        title: 'Nelisäikeinen seppele (Viersträhniger Kranz)',
        strands: meditation.strands,
        examples: meditation.examples || [],
      },
    });
  }

  if (meditation.breathingGuide) {
    blocks.push({
      id: `${meditation.id || 'med'}-breath`,
      type: 'breathing_timer',
      data: {
        title: 'Hengitys ja Jeesus-rukous',
        inBreath: 'Herra Jeesus Kristus, Jumalan Poika',
        outBreath: 'Armahda minua syntistä',
        alternativeShort: meditation.breathingGuide.alternativeShort,
        cycleSeconds: 5,
      },
    });
  }

  if (Array.isArray(meditation.steps) && meditation.steps.length > 0) {
    blocks.push({
      id: `${meditation.id || 'med'}-steps`,
      type: 'steps_guide',
      data: {
        title: meditation.title,
        layout: meditation.id === 'jesus_prayer' ? 'grid' : 'cards',
        steps: meditation.steps,
      },
    });
  }

  return blocks;
}

export function ensureDevotionBlocks(devotion) {
  if (!devotion) return [];
  if (Array.isArray(devotion.blocks) && devotion.blocks.length > 0) {
    return devotion.blocks;
  }

  const blocks = [];

  if (devotion.format === 'single_block') {
    if (devotion.content) {
      blocks.push({
        id: 'devotion-single-text',
        type: 'reflection',
        data: { content: devotion.content },
      });
    }
    if (devotion.youtube_url) {
      blocks.push({
        id: 'devotion-youtube',
        type: 'media_embed',
        data: { mediaType: 'youtube', url: devotion.youtube_url },
      });
    }
    return blocks;
  }

  let order = ['scripture', 'meditation', 'prayer', 'hymn'];
  if (Array.isArray(devotion.pieces_order) && devotion.pieces_order.length > 0) {
    order = devotion.pieces_order;
  } else if (typeof devotion.pieces_order === 'string') {
    try {
      const parsed = JSON.parse(devotion.pieces_order);
      if (Array.isArray(parsed) && parsed.length > 0) order = parsed;
    } catch (_) {
      // keep default
    }
  }

  for (const pieceKey of order) {
    if (pieceKey === 'scripture' && (devotion.scripture_text || devotion.scripture_reference)) {
      blocks.push({
        id: 'devotion-scripture',
        type: 'scripture',
        data: {
          reference: devotion.scripture_reference || '',
          text: devotion.scripture_text || '',
        },
      });
    } else if (pieceKey === 'meditation' && (devotion.meditation_content || devotion.content)) {
      blocks.push({
        id: 'devotion-meditation',
        type: 'reflection',
        data: {
          content: devotion.meditation_content || devotion.content || '',
        },
      });
    } else if (pieceKey === 'prayer' && (devotion.closing_prayer || devotion.prayer)) {
      blocks.push({
        id: 'devotion-prayer',
        type: 'prayer',
        data: {
          title: 'Rukous',
          content: devotion.closing_prayer || devotion.prayer || '',
        },
      });
    } else if (pieceKey === 'hymn' && (devotion.hymn_suggestion || devotion.hymn)) {
      blocks.push({
        id: 'devotion-hymn',
        type: 'hymn',
        data: {
          title: devotion.hymn_suggestion || devotion.hymn || '',
        },
      });
    }
  }

  if (devotion.youtube_url) {
    blocks.push({
      id: 'devotion-youtube',
      type: 'media_embed',
      data: {
        mediaType: 'youtube',
        url: devotion.youtube_url,
      },
    });
  }

  return blocks;
}
