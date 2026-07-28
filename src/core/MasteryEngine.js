/**
 * MasteryEngine - Calculates mastery score changes for ChemQuest.
 * 
 * Pure function: calculates the delta and the new mastery score
 * based on the 11-row formula from the spreadsheet.
 */

import gameRules from '../data/gameRules.json';

/**
 * Calculate the new mastery score and the delta based on a question attempt.
 * 
 * @param {number} currentMastery - Current mastery score (0-100)
 * @param {Object} attempt - Details of the attempt
 * @param {boolean} attempt.isCorrect
 * @param {string} attempt.confidence - 'rendah' | 'sedang' | 'tinggi'
 * @param {number} attempt.responseTimeMs
 * @param {number} attempt.timeLimitSec
 * @param {number} attempt.hintLevel - Number of hints used (0-3)
 * @param {boolean} attempt.hasMisconception - If a misconception was detected
 * @returns {Object} { newMastery, delta, breakdown }
 */
export function calculateMasteryDelta(currentMastery, { isCorrect, confidence, responseTimeMs, timeLimitSec, hintLevel, hasMisconception }) {
  const weights = gameRules.mastery.weights;
  let delta = 0;
  const breakdown = {};

  // 1. Correct/Wrong base weight
  if (isCorrect) {
    delta += weights.correctAnswer;
    breakdown.base = weights.correctAnswer;
  } else {
    delta += weights.wrongAnswer;
    breakdown.base = weights.wrongAnswer;
  }

  // 2. Confidence weight
  if (isCorrect) {
    if (confidence === 'tinggi') {
      delta += weights.confidenceHighCorrect;
      breakdown.confidence = weights.confidenceHighCorrect;
    } else if (confidence === 'sedang') {
      delta += weights.confidenceMediumCorrect;
      breakdown.confidence = weights.confidenceMediumCorrect;
    } else if (confidence === 'rendah') {
      delta += weights.confidenceLowCorrect;
      breakdown.confidence = weights.confidenceLowCorrect;
    }
  } else {
    if (confidence === 'tinggi') {
      delta += weights.confidenceHighWrong;
      breakdown.confidence = weights.confidenceHighWrong;
    } else if (confidence === 'sedang') {
      delta += weights.confidenceMediumWrong;
      breakdown.confidence = weights.confidenceMediumWrong;
    } else if (confidence === 'rendah') {
      delta += weights.confidenceLowWrong;
      breakdown.confidence = weights.confidenceLowWrong;
    }
  }

  // 3. Fast answer bonus (only if correct)
  if (isCorrect) {
    const timeLimitMs = timeLimitSec * 1000;
    if (responseTimeMs < timeLimitMs * weights.fastThreshold) {
      delta += weights.fastAnswer;
      breakdown.speed = weights.fastAnswer;
    }
  }

  // 4. Hint penalty
  if (hintLevel > 0) {
    // hintPenalty is an array: [-1, -2, -3] for 1, 2, 3 hints
    const penaltyIndex = Math.min(hintLevel - 1, weights.hintPenalty.length - 1);
    const hPen = weights.hintPenalty[penaltyIndex];
    delta += hPen;
    breakdown.hint = hPen;
  }

  // 5. Misconception penalty
  if (hasMisconception) {
    delta += weights.misconceptionPenalty;
    breakdown.misconception = weights.misconceptionPenalty;
  }

  // Calculate new mastery, clamped between min and max
  let newMastery = currentMastery + delta;
  newMastery = Math.max(gameRules.mastery.minValue, Math.min(gameRules.mastery.maxValue, newMastery));

  // The actual delta might be different if it hit the cap
  const actualDelta = newMastery - currentMastery;

  return {
    newMastery,
    delta: actualDelta,
    breakdown
  };
}
