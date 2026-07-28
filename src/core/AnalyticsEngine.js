/**
 * AnalyticsEngine - Formats events for the Supabase backend.
 * 
 * Takes raw game events and structures them into the flat schemas
 * expected by the Supabase tables (analytics_events, mastery_logs).
 */

import { eventBus, EVENTS } from './EventBus';

export class AnalyticsEngine {
  constructor(playerModel, supabaseClient = null) {
    this.playerModel = playerModel;
    this.supabase = supabaseClient; // Can be null for offline/local testing

    // Subscribe to events that need logging
    this.unsubscribers = [
      eventBus.on(EVENTS.QUESTION_ANSWERED, this.logQuestionAttempt.bind(this)),
      eventBus.on(EVENTS.MISCONCEPTION_DETECTED, this.logMisconception.bind(this)),
      eventBus.on(EVENTS.MASTERY_UPDATED, this.logMasteryChange.bind(this)),
      eventBus.on(EVENTS.EPISODE_COMPLETED, this.logEpisodeCompletion.bind(this)),
      eventBus.on(EVENTS.BADGE_UNLOCKED, this.logBadgeEarned.bind(this)),
      eventBus.on(EVENTS.REFLECTION_SUBMITTED, this.logReflection.bind(this)),
    ];
  }

  cleanup() {
    this.unsubscribers.forEach(unsub => unsub());
  }

  async _insert(table, data) {
    if (!this.supabase) {
      console.log(`[Analytics: ${table}]`, data);
      return;
    }

    try {
      const { error } = await this.supabase.from(table).insert([data]);
      if (error) throw error;
    } catch (err) {
      console.error(`[AnalyticsEngine] Failed to insert to ${table}:`, err);
    }
  }

  getBasePayload() {
    const profile = this.playerModel.getProfile();
    return {
      student_id: profile.studentId || 'anonymous',
      session_id: profile.sessionId,
      timestamp: new Date().toISOString(),
    };
  }

  logQuestionAttempt(payload) {
    // payload: { questionId, episode, level, isCorrect, confidence, responseTimeMs, hintLevel, selectedOption }
    const data = {
      ...this.getBasePayload(),
      event_type: 'question_attempt',
      episode_id: payload.episode,
      question_id: payload.questionId,
      difficulty_level: payload.level,
      is_correct: payload.isCorrect,
      confidence_level: payload.confidence,
      response_time_ms: payload.responseTimeMs,
      hints_used: payload.hintLevel,
      selected_option: payload.selectedOption
    };
    this._insert('analytics_events', data);
  }

  logMisconception(payload) {
    // payload: { questionId, misconceptionTag, episode }
    const data = {
      ...this.getBasePayload(),
      event_type: 'misconception_detected',
      episode_id: payload.episode,
      question_id: payload.questionId,
      misconception_tag: payload.misconceptionTag
    };
    this._insert('analytics_events', data);
  }

  logMasteryChange(payload) {
    // payload: { oldMastery, newMastery, delta, breakdown, concept }
    const data = {
      student_id: this.playerModel.getProfile().studentId || 'anonymous',
      concept: payload.concept || 'general',
      old_score: payload.oldMastery,
      new_score: payload.newMastery,
      delta: payload.delta,
      factors_json: payload.breakdown,
      timestamp: new Date().toISOString()
    };
    this._insert('mastery_logs', data);
  }

  logEpisodeCompletion(payload) {
    // payload: { episodeId, totalTimeSec, score, isPerfect }
    const data = {
      ...this.getBasePayload(),
      event_type: 'episode_completed',
      episode_id: payload.episodeId,
      metadata: {
        total_time_sec: payload.totalTimeSec,
        score: payload.score,
        is_perfect: payload.isPerfect
      }
    };
    this._insert('analytics_events', data);
  }

  logBadgeEarned(payload) {
    // payload: { badgeId, badgeName }
    const data = {
      ...this.getBasePayload(),
      event_type: 'badge_earned',
      metadata: {
        badge_id: payload.badgeId,
        badge_name: payload.badgeName
      }
    };
    this._insert('analytics_events', data);
  }

  logReflection(payload) {
    // payload: { episodeId, responseText, score, matchedKeywords }
    const data = {
      ...this.getBasePayload(),
      event_type: 'reflection_submitted',
      episode_id: payload.episodeId,
      metadata: {
        response_length: payload.responseText.length,
        score: payload.score,
        matched_keywords: payload.matchedKeywords
      }
    };
    this._insert('analytics_events', data);
  }
}
