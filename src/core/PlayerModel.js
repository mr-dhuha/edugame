/**
 * PlayerModel - Central state repository for a player's session.
 * 
 * Combines data from all engines and persists to local storage
 * (and eventually Supabase via AnalyticsEngine).
 */

import { eventBus, EVENTS } from './EventBus';
import { calculateMasteryDelta } from './MasteryEngine';
import { calculateQuestionXP, calculateEpisodeBonus, calculateTotalEpisodeXP } from './XPEngine';
import { checkBadges } from './BadgeEngine';

export class PlayerModel {
  constructor() {
    this.state = this.getInitialState();

    // Auto-subscribe to events to update state
    eventBus.on(EVENTS.QUESTION_ANSWERED, this.handleQuestionAnswered.bind(this));
    eventBus.on(EVENTS.EPISODE_COMPLETED, this.handleEpisodeCompleted.bind(this));
    eventBus.on(EVENTS.EPISODE_FAILED, this.handleEpisodeFailed.bind(this));
    eventBus.on(EVENTS.REFLECTION_SUBMITTED, this.handleReflectionSubmitted.bind(this));
  }

  getInitialState() {
    return {
      profile: {
        studentId: null,
        name: 'Guest',
        sessionId: crypto.randomUUID(),
      },
      mastery: 50,
      xp: 0,
      completedEpisodes: new Set(),
      failedEpisodes: {}, // { [episodeId]: timestamp }
      earnedBadges: new Set(),
      episodeStats: {}, // { [episodeId]: { correctCount, totalCount, hintsUsed, totalTimeSec, totalTimeLimitSec } }
      allResults: [], // Array of question results
      correctlyAnsweredQuestions: new Set()
    };
  }

  loadState(savedState) {
    if (!savedState) return;
    this.state = {
      ...this.state,
      ...savedState,
      completedEpisodes: new Set(savedState.completedEpisodes || []),
      failedEpisodes: savedState.failedEpisodes || {},
      earnedBadges: new Set(savedState.earnedBadges || []),
      correctlyAnsweredQuestions: new Set(savedState.correctlyAnsweredQuestions || [])
    };
    eventBus.emit(EVENTS.DATA_LOADED, this.state);
  }

  exportState() {
    // Auto-fix null episode ids from previous FSMEngine bug
    if (this.state.completedEpisodes.has(null)) {
      this.state.completedEpisodes.delete(null);
      this.state.completedEpisodes.add(1);
    }
    return {
      ...this.state,
      completedEpisodes: new Set(this.state.completedEpisodes),
      failedEpisodes: { ...this.state.failedEpisodes },
      earnedBadges: new Set(this.state.earnedBadges),
      correctlyAnsweredQuestions: new Set(this.state.correctlyAnsweredQuestions)
    };
  }

  serialize() {
    return JSON.stringify({
      ...this.state,
      completedEpisodes: Array.from(this.state.completedEpisodes),
      earnedBadges: Array.from(this.state.earnedBadges),
      correctlyAnsweredQuestions: Array.from(this.state.correctlyAnsweredQuestions)
    });
  }

  deserialize(jsonString) {
    if (!jsonString) return;
    try {
      const parsed = JSON.parse(jsonString);
      this.loadState(parsed);
    } catch (e) {
      console.error("[PlayerModel] Failed to deserialize:", e);
    }
  }

  getProfile() {
    return this.state.profile;
  }

  setProfile(studentId, name) {
    this.state.profile.studentId = studentId;
    this.state.profile.name = name;
  }

  async syncFromSupabase(studentId, supabase) {
    if (!supabase) return;
    try {
      // 1. Restore Mastery
      const { data: masteryData } = await supabase
        .from('mastery_logs')
        .select('new_score')
        .eq('student_id', studentId)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (masteryData && masteryData.length > 0) {
        this.state.mastery = masteryData[0].new_score;
      }

      // 2. Restore Events (Completed Episodes, Badges, XP, Question Attempts)
      const { data: eventsData } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('student_id', studentId);

      if (eventsData) {
        let maxXP = 0;
        this.state.episodeStats = {}; // Bersihkan dan bangun ulang

        eventsData.forEach(ev => {
          if (ev.event_type === 'episode_completed') {
            this.state.completedEpisodes.add(ev.episode_id);
            if (ev.metadata && ev.metadata.score && ev.metadata.score > maxXP) {
              maxXP = ev.metadata.score;
            }
          } else if (ev.event_type === 'REFLECTION_SUBMITTED' || ev.event_type === 'reflection_submitted') {
            if (ev.episode_id) this.state.completedEpisodes.add(ev.episode_id);
          } else if (ev.event_type === 'badge_earned' && ev.metadata && ev.metadata.badge_id) {
            this.state.earnedBadges.add(ev.metadata.badge_id);
          } else if (ev.event_type === 'question_attempt') {
            const epId = ev.episode_id;
            if (epId) {
              for (let i = 1; i < epId; i++) {
                this.state.completedEpisodes.add(i);
              }
            }
            if (!this.state.episodeStats[epId]) {
              this.state.episodeStats[epId] = {
                correctCount: 0, totalCount: 0, hintsUsed: 0, totalTimeSec: 0, totalTimeLimitSec: 0, results: []
              };
            }
            const epStats = this.state.episodeStats[epId];
            epStats.totalCount++;
            if (ev.is_correct) {
              epStats.correctCount++;
              this.state.correctlyAnsweredQuestions.add(ev.question_id);
            }
            epStats.hintsUsed += (ev.hints_used || 0);
            epStats.totalTimeSec += ((ev.response_time_ms || 0) / 1000);
            epStats.totalTimeLimitSec += 60; // Asumsi default limit jika tidak ada di DB
            
            epStats.results.push({
              questionId: ev.question_id,
              episode: epId,
              level: ev.difficulty_level,
              isCorrect: ev.is_correct,
              confidence: ev.confidence_level,
              responseTimeMs: ev.response_time_ms,
              hintLevel: ev.hints_used
            });
          }
        });
        
        // Kalkulasi ulang XP: Setidaknya 100 XP untuk setiap pertanyaan unik yang pernah dijawab benar
        const recalculatedXP = this.state.correctlyAnsweredQuestions.size * 100;
        // Gunakan maxXP dari riwayat episode_completed, atau recalculatedXP jika lebih besar (misal drop-out tengah episode)
        this.state.xp = Math.max(maxXP, recalculatedXP);
      }

      console.log("[PlayerModel] Synced state from Supabase:", this.state);
      eventBus.emit(EVENTS.DATA_LOADED, this.state);
    } catch (err) {
      console.error("[PlayerModel] Error syncing from Supabase:", err);
    }
  }

  handleQuestionAnswered(payload) {
    // payload: { questionId, episode, level, isCorrect, confidence, responseTimeMs, timeLimitSec, hintLevel, hasMisconception }

    // 1. Update Mastery (Jika dianulir, jangan kurangi mastery)
    if (!payload.isAnulir) {
      const { newMastery, delta, breakdown } = calculateMasteryDelta(this.state.mastery, payload);
      const oldMastery = this.state.mastery;
      this.state.mastery = newMastery;

      eventBus.emit(EVENTS.MASTERY_UPDATED, {
        oldMastery,
        newMastery,
        delta,
        breakdown,
        concept: payload.concept
      });
    }

    // 2. Update XP
    const xpResult = calculateQuestionXP(payload);
    this.state.xp += xpResult.totalXP;

    if (xpResult.totalXP > 0) {
      eventBus.emit(EVENTS.XP_AWARDED, {
        amount: xpResult.totalXP,
        breakdown: xpResult.bonusBreakdown,
        newTotal: this.state.xp
      });
    }

    // 3. Track Stats
    this.state.allResults.push(payload);

    if (!this.state.episodeStats[payload.episode]) {
      this.state.episodeStats[payload.episode] = {
        correctCount: 0, totalCount: 0, hintsUsed: 0, totalTimeSec: 0, totalTimeLimitSec: 0, results: []
      };
    }

    const epStats = this.state.episodeStats[payload.episode];
    epStats.totalCount++;
    if (payload.isCorrect) epStats.correctCount++;
    epStats.hintsUsed += payload.hintLevel;
    epStats.totalTimeSec += (payload.responseTimeMs / 1000);
    epStats.totalTimeLimitSec += payload.timeLimitSec;
    epStats.results.push(payload);

    // 4. Check Badges
    this._checkAndAwardBadges();
  }

  handleEpisodeCompleted(payload) {
    // payload: { episodeId }
    this.state.completedEpisodes.add(payload.episodeId);
    if (this.state.failedEpisodes[payload.episodeId]) {
      delete this.state.failedEpisodes[payload.episodeId];
    }

    const epStats = this.state.episodeStats[payload.episodeId];
    if (epStats) {
      const { perfectBonus, isPerfect } = calculateEpisodeBonus(epStats.results);
      if (perfectBonus > 0) {
        this.state.xp += perfectBonus;
        eventBus.emit(EVENTS.XP_AWARDED, {
          amount: perfectBonus,
          breakdown: { perfectEpisode: perfectBonus },
          newTotal: this.state.xp
        });
      }

      // Update completion event with stats
      payload.totalTimeSec = epStats.totalTimeSec;
      payload.score = this.state.xp;
      payload.isPerfect = isPerfect;
    }

    this._checkAndAwardBadges();
  }

  handleEpisodeFailed(payload) {
    // payload: { episodeId }
    this.state.failedEpisodes[payload.episodeId] = Date.now();
    // Auto save will be triggered via event bus if we emit, but FSMEngine transition to DASHBOARD will trigger it anyway.
  }

  handleReflectionSubmitted(payload) {
    // payload: { episodeId, responseText, score, matchedKeywords }
    // Could award XP based on reflection score here if desired
  }

  _checkAndAwardBadges() {
    const newBadges = checkBadges({
      completedEpisodes: this.state.completedEpisodes,
      episodeStats: this.state.episodeStats,
      allResults: this.state.allResults,
      earnedBadges: this.state.earnedBadges
    });

    newBadges.forEach(badge => {
      this.state.earnedBadges.add(badge.id);
      eventBus.emit(EVENTS.BADGE_UNLOCKED, {
        badgeId: badge.id,
        badgeName: badge.name,
        badgeIcon: badge.icon
      });
    });
  }
}

// Singleton instance
export const playerModel = new PlayerModel();
