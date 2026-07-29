/**
 * XPEngine - Deterministic XP calculation for ChemQuest.
 * 
 * Pure function: given question data + student performance, returns XP awarded.
 */

import gameRules from '../data/gameRules.json';

/**
 * Calculate XP for a single question answer.
 * 
 * @param {Object} params
 * @param {string} params.level - 'Easy' | 'Medium' | 'Hard'
 * @param {boolean} params.isCorrect
 * @param {string} params.confidence - 'rendah' | 'sedang' | 'tinggi'
 * @param {number} params.responseTimeMs - Time taken to answer
 * @param {number} params.timeLimitSec - Time limit for this question
 * @param {number} params.hintLevel - 0-3 (how many hints were used)
 * @returns {Object} { totalXP, baseXP, bonusBreakdown }
 */
export function calculateQuestionXP({ level, isCorrect, confidence, responseTimeMs, timeLimitSec, hintLevel, points }) {
  const baseXP = isCorrect ? (points || gameRules.xp.basePoints[level] || 100) : 0;
  const bonus = gameRules.xp.bonus;
  const bonusBreakdown = {};
  let totalBonus = 0;

  if (!isCorrect) {
    return {
      totalXP: 0,
      baseXP: 0,
      bonusBreakdown: {},
    };
  }

  // Fast answer bonus
  const timeLimitMs = timeLimitSec * 1000;
  if (responseTimeMs < timeLimitMs * gameRules.mastery.weights.fastThreshold) {
    bonusBreakdown.fastAnswer = bonus.fastAnswer;
    totalBonus += bonus.fastAnswer;
  }

  // No hint bonus
  if (hintLevel === 0) {
    bonusBreakdown.noHint = bonus.noHint;
    totalBonus += bonus.noHint;
  }

  // High confidence + correct bonus
  if (confidence === 'tinggi') {
    bonusBreakdown.highConfidenceCorrect = bonus.highConfidenceCorrect;
    totalBonus += bonus.highConfidenceCorrect;
  }

  return {
    totalXP: baseXP + totalBonus,
    baseXP,
    bonusBreakdown,
  };
}

/**
 * Calculate episode completion bonus.
 * 
 * @param {Array<Object>} episodeResults - All question results for the episode
 * @returns {Object} { perfectBonus, isPerfect }
 */
export function calculateEpisodeBonus(episodeResults) {
  const allCorrect = episodeResults.every((r) => r.isCorrect);

  return {
    perfectBonus: allCorrect ? gameRules.xp.bonus.perfectEpisode : 0,
    isPerfect: allCorrect,
  };
}

/**
 * Calculate total XP for an entire episode.
 * 
 * @param {Array<Object>} questionXPResults - Array of calculateQuestionXP results
 * @param {boolean} isPerfect - Whether all questions were correct
 * @returns {number} Total XP
 */
export function calculateTotalEpisodeXP(questionXPResults, isPerfect) {
  const questionTotal = questionXPResults.reduce((sum, r) => sum + r.totalXP, 0);
  const perfectBonus = isPerfect ? gameRules.xp.bonus.perfectEpisode : 0;
  return questionTotal + perfectBonus;
}
