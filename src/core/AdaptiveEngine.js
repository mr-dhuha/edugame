/**
 * AdaptiveEngine - Handles all adaptive decision-making for ChemQuest.
 * 
 * Two levels of adaptation:
 * 1. Per-question: 4-quadrant (correct/wrong × high/low confidence)
 * 2. Per-gate: After every 3 questions in a difficulty level
 * 
 * This engine is pure logic - no React, no DOM, no side effects.
 * It reads gameRules.json config and returns decision objects.
 */

import gameRules from '../data/gameRules.json';

/**
 * Determine the adaptive action after a single question + confidence check.
 * 
 * @param {Object} params
 * @param {boolean} params.isCorrect
 * @param {string} params.confidence - 'rendah' | 'sedang' | 'tinggi'
 * @param {string} params.misconceptionTag - e.g. 'M-ARR-01'
 * @param {string} params.feedbackCorrect
 * @param {string} params.hintWrong
 * @returns {Object} { action, label, showMisconception, feedback, hint }
 */
export function evaluateQuestionOutcome({ isCorrect, confidence, misconceptionTag, feedbackCorrect, hintWrong }) {
  const quadrant = gameRules.adaptiveQuadrant;
  let result;

  if (isCorrect) {
    switch (confidence) {
      case 'tinggi':
        result = { ...quadrant.correctHighConfidence };
        break;
      case 'sedang':
        result = { ...quadrant.correctMediumConfidence };
        break;
      case 'rendah':
        result = { ...quadrant.correctLowConfidence };
        break;
      default:
        result = { ...quadrant.correctMediumConfidence };
    }
    result.feedback = feedbackCorrect;
    result.showMisconception = false;
    result.misconceptionTag = null;
  } else {
    switch (confidence) {
      case 'tinggi':
        result = { ...quadrant.wrongHighConfidence };
        break;
      case 'sedang':
        result = { ...quadrant.wrongMediumConfidence };
        break;
      case 'rendah':
        result = { ...quadrant.wrongLowConfidence };
        break;
      default:
        result = { ...quadrant.wrongMediumConfidence };
    }
    result.feedback = hintWrong;
    result.showMisconception = confidence === 'tinggi';
    result.misconceptionTag = misconceptionTag;
  }

  result.isCorrect = isCorrect;
  result.confidence = confidence;

  return result;
}

/**
 * Evaluate a gate (group of 3 questions in one difficulty level).
 * 
 * @param {Array<Object>} gateResults - Array of 3 result objects with { isCorrect, confidence, ... }
 * @returns {Object} { action, correctCount, totalQuestions, message }
 */
export function evaluateGate(gateResults) {
  const correctCount = gateResults.filter((r) => r.isCorrect || r.isAnulir).length;
  const totalQuestions = gateResults.length;
  const thresholds = gameRules.gate.thresholds;

  let action, message;

  if (correctCount >= thresholds.directPass.exactCorrect) {
    action = thresholds.directPass.action; // 'DIRECT_PASS'
    message = 'Luar biasa! Kamu menguasai level ini. Lanjut ke level berikutnya dengan bonus!';
  } else if (correctCount >= thresholds.conditionalPass.exactCorrect) {
    action = thresholds.conditionalPass.action; // 'CONDITIONAL_PASS'
    message = 'Bagus! Kamu bisa lanjut ke level berikutnya. Perhatikan petunjuk kontekstual ini.';
  } else {
    action = thresholds.remediation.action; // 'REMEDIATION'
    message = 'Belum cukup kuat. Mari kita perkuat pemahamanmu dulu sebelum lanjut.';
  }

  const mistakes = gateResults
    .filter((r) => !r.isCorrect)
    .map((r) => r.concept || r.selectedOption || 'Konsep terkait')
    .join(', ');

  return {
    action,
    correctCount,
    totalQuestions,
    message,
    mistakes,
    shouldAwardBonus: action === 'DIRECT_PASS',
    needsRemediation: action === 'REMEDIATION',
  };
}

/**
 * Determine what difficulty level to go to next.
 * 
 * @param {string} currentDifficulty - 'Easy' | 'Medium' | 'Hard'
 * @param {string} gateAction - 'DIRECT_PASS' | 'CONDITIONAL_PASS' | 'REMEDIATION'
 * @returns {Object} { nextDifficulty, isEpisodeDone, shouldRepeat }
 */
export function getNextDifficulty(currentDifficulty, gateAction) {
  const order = gameRules.difficultyOrder; // ['Easy', 'Medium', 'Hard']
  const currentIndex = order.indexOf(currentDifficulty);

  // Jika gagal gate (REMEDIATION) dan mode strict aktif, maka ngulang.
  // Jika mode strict mati (relaxed), maka lanjut saja terus sampai tamat episode.
  const isStrict = gameRules.progression?.strictGateProgression !== false;
  if (gateAction === 'REMEDIATION' && isStrict) {
    return {
      nextDifficulty: currentDifficulty,
      isEpisodeDone: false,
      shouldRepeat: true,
    };
  }

  // DIRECT_PASS or CONDITIONAL_PASS or (REMEDIATION && not strict) → advance
  const nextIndex = currentIndex + 1;
  if (nextIndex >= order.length) {
    return {
      nextDifficulty: null,
      isEpisodeDone: true,
      shouldRepeat: false,
    };
  }

  return {
    nextDifficulty: order[nextIndex],
    isEpisodeDone: false,
    shouldRepeat: false,
  };
}

/**
 * Check if an episode should be unlocked.
 * 
 * @param {number} episodeId - Episode to check (1-4)
 * @param {Set<number>} completedEpisodes - Set of completed episode IDs
 * @param {Array} episodesData - episodes.json data
 * @returns {boolean}
 */
export function isEpisodeUnlocked(episodeId, playerState, episodesData) {
  // Jika mode unlock semua aktif, buka semua episode
  if (gameRules.progression?.unlockAllEpisodes) return true;

  const episode = episodesData.find((e) => e.id === episodeId);
  if (!episode) return false;

  // Jika murid sudah punya progress di episode ini (pernah menjawab soal), anggap terbuka
  if (playerState.episodeStats && playerState.episodeStats[episodeId]) return true;

  // No unlock condition = always available (Episode 1)
  if (!episode.unlockCondition) return true;

  const { episodeCompleted } = episode.unlockCondition;
  const completedEpisodes = playerState.completedEpisodes || new Set();
  
  return completedEpisodes.has(episodeCompleted) || 
         completedEpisodes.has(String(episodeCompleted)) || 
         completedEpisodes.has(Number(episodeCompleted));
}

/**
 * Score a reflection response based on keyword matching.
 * 
 * @param {string} studentResponse - The student's text
 * @param {Array<string>} keyPoints - Keywords to look for
 * @returns {Object} { score, matchedKeywords, totalKeywords, feedback }
 */
export function scoreReflection(studentResponse, keyPoints) {
  if (!studentResponse || studentResponse.trim().length === 0) {
    return {
      score: 0,
      matchedKeywords: [],
      totalKeywords: keyPoints.length,
      feedback: 'Kosong atau tidak relevan.',
    };
  }

  const normalized = studentResponse.toLowerCase();
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const thresholds = gameRules.reflection.keyPointThresholds;

  // Check minimum word count
  if (wordCount < gameRules.reflection.minWords) {
    return {
      score: 1,
      matchedKeywords: [],
      totalKeywords: keyPoints.length,
      feedback: 'Jawaban terlalu singkat. Coba jelaskan lebih detail.',
    };
  }

  // Count keyword matches
  const matchedKeywords = keyPoints.filter((kp) =>
    normalized.includes(kp.toLowerCase())
  );
  const matchCount = matchedKeywords.length;

  let score, feedback;
  if (matchCount >= thresholds['3']) {
    score = 3;
    feedback = 'Konsep benar, bukti jelas, dan hubungan dengan data/misi kuat.';
  } else if (matchCount >= thresholds['2']) {
    score = 2;
    feedback = 'Konsep utama benar tetapi bukti/hubungan belum lengkap.';
  } else if (matchCount >= thresholds['1']) {
    score = 1;
    feedback = 'Jawaban umum/deskriptif atau memuat sebagian miskonsepsi.';
  } else {
    score = 0;
    feedback = 'Kosong atau tidak relevan.';
  }

  return {
    score,
    matchedKeywords,
    totalKeywords: keyPoints.length,
    feedback,
  };
}

/**
 * Shuffle options array while preserving isCorrect flags.
 * Uses Fisher-Yates shuffle.
 * 
 * @param {Array<Object>} options - Array of { label, text, isCorrect? }
 * @returns {Array<Object>} Shuffled options with labels reassigned A-E
 */
export function shuffleOptions(options) {
  const labels = ['A', 'B', 'C', 'D', 'E'];
  const shuffled = [...options];

  // Fisher-Yates
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Reassign labels
  return shuffled.map((opt, idx) => ({
    ...opt,
    label: labels[idx],
  }));
}
