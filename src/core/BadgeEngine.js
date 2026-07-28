/**
 * BadgeEngine - Badge unlock condition checker for ChemQuest.
 * 
 * Pure functions: given player state, returns which badges should unlock.
 */

import gameRules from '../data/gameRules.json';

/**
 * Check all badge conditions against current player state.
 * 
 * @param {Object} playerState
 * @param {Set<number>} playerState.completedEpisodes
 * @param {Object} playerState.episodeStats - { [episodeId]: { correctCount, totalCount, hintsUsed, totalTimeSec, totalTimeLimitSec } }
 * @param {Array<Object>} playerState.allResults - All question results
 * @param {Set<string>} playerState.earnedBadges - Already earned badge IDs
 * @returns {Array<Object>} Newly unlocked badges
 */
export function checkBadges(playerState) {
  const { completedEpisodes, episodeStats, allResults, earnedBadges } = playerState;
  const newBadges = [];

  for (const badge of gameRules.badges) {
    // Skip already earned
    if (earnedBadges.has(badge.id)) continue;

    const earned = evaluateCondition(badge.condition, {
      completedEpisodes,
      episodeStats,
      allResults,
    });

    if (earned) {
      newBadges.push({ ...badge });
    }
  }

  return newBadges;
}

/**
 * Evaluate a single badge condition.
 * 
 * @param {Object} condition
 * @param {Object} context
 * @returns {boolean}
 */
function evaluateCondition(condition, context) {
  const { completedEpisodes, episodeStats, allResults } = context;

  switch (condition.type) {
    case 'episodeCompleted': {
      return completedEpisodes.has(condition.episode);
    }

    case 'episodePerfect': {
      if (!completedEpisodes.has(condition.episode)) return false;
      const stats = episodeStats[condition.episode];
      if (!stats) return false;
      return stats.correctCount === stats.totalCount;
    }

    case 'noHints': {
      // Any completed episode with 0 hints
      for (const [epId, stats] of Object.entries(episodeStats)) {
        if (completedEpisodes.has(Number(epId)) && stats.hintsUsed === 0) {
          return true;
        }
      }
      return false;
    }

    case 'fastEpisode': {
      // Any completed episode under 50% total time limit
      for (const [epId, stats] of Object.entries(episodeStats)) {
        if (
          completedEpisodes.has(Number(epId)) &&
          stats.totalTimeSec < stats.totalTimeLimitSec * 0.5
        ) {
          return true;
        }
      }
      return false;
    }

    case 'calibration': {
      // 80%+ of all answers are correct + high confidence
      if (allResults.length === 0) return false;
      const highConfCorrect = allResults.filter(
        (r) => r.isCorrect && r.confidence === 'tinggi'
      ).length;
      return highConfCorrect / allResults.length >= (condition.threshold || 0.8);
    }

    default:
      return false;
  }
}

/**
 * Get progress towards a specific badge.
 * 
 * @param {string} badgeId
 * @param {Object} playerState
 * @returns {Object} { current, target, percentage, description }
 */
export function getBadgeProgress(badgeId, playerState) {
  const badge = gameRules.badges.find((b) => b.id === badgeId);
  if (!badge) return null;

  const { completedEpisodes, episodeStats, allResults } = playerState;
  const condition = badge.condition;

  switch (condition.type) {
    case 'episodeCompleted':
      return {
        current: completedEpisodes.has(condition.episode) ? 1 : 0,
        target: 1,
        percentage: completedEpisodes.has(condition.episode) ? 100 : 0,
        description: `Selesaikan Episode ${condition.episode}`,
      };

    case 'episodePerfect': {
      const stats = episodeStats[condition.episode];
      if (!stats) return { current: 0, target: 9, percentage: 0, description: `Jawab semua benar di Episode ${condition.episode}` };
      return {
        current: stats.correctCount,
        target: stats.totalCount || 9,
        percentage: Math.round((stats.correctCount / (stats.totalCount || 9)) * 100),
        description: `${stats.correctCount}/${stats.totalCount || 9} benar di Episode ${condition.episode}`,
      };
    }

    case 'calibration': {
      if (allResults.length === 0) return { current: 0, target: 80, percentage: 0, description: '0% kalibrasi keyakinan' };
      const highConfCorrect = allResults.filter((r) => r.isCorrect && r.confidence === 'tinggi').length;
      const pct = Math.round((highConfCorrect / allResults.length) * 100);
      return {
        current: pct,
        target: 80,
        percentage: Math.min(pct, 100),
        description: `${pct}% keyakinan tinggi-benar`,
      };
    }

    default:
      return { current: 0, target: 1, percentage: 0, description: badge.description };
  }
}
