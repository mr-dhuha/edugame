/**
 * FSMEngine - Finite State Machine for ChemQuest game loop.
 * 
 * Manages the 12 transition states defined in the implementation plan.
 */

import { eventBus, EVENTS } from './EventBus';

export const STATES = Object.freeze({
  INIT: 'INIT',
  LOGIN: 'LOGIN',
  TEACHER_DASHBOARD: 'TEACHER_DASHBOARD',
  DASHBOARD: 'DASHBOARD',
  CERTIFICATE: 'CERTIFICATE',
  EPISODE_INTRO: 'EPISODE_INTRO',
  QUESTION_START: 'QUESTION_START',
  AWAIT_ANSWER: 'AWAIT_ANSWER',
  AWAIT_CONFIDENCE: 'AWAIT_CONFIDENCE',
  FEEDBACK: 'FEEDBACK',
  GATE_CHECK: 'GATE_CHECK',
  REMEDIATION: 'REMEDIATION',
  EPISODE_REFLECTION: 'EPISODE_REFLECTION',
  EPISODE_COMPLETE: 'EPISODE_COMPLETE'
});

export class FSMEngine {
  constructor() {
    this.currentState = STATES.INIT;
    this.context = {
      currentEpisodeId: null,
      currentDifficulty: null,
      gateQuestionCount: 0,
      totalQuestionsAnswered: 0,
      pendingAdaptiveAction: null
    };
  }

  transition(newState, payload = {}) {
    console.log(`[FSM] Transition: ${this.currentState} -> ${newState}`, payload);
    this.currentState = newState;

    // Update context based on state
    switch (newState) {
      case STATES.EPISODE_INTRO:
        this.context.currentEpisodeId = payload.episodeId;
        this.context.currentDifficulty = 'Easy';
        this.context.gateQuestionCount = 0;
        break;
      case STATES.QUESTION_START:
        // Reset per-question tracking if needed
        break;
      case STATES.FEEDBACK:
        this.context.gateQuestionCount++;
        this.context.totalQuestionsAnswered++;
        this.context.pendingAdaptiveAction = payload.adaptiveAction; // e.g. 'CONTINUE', 'SHOW_HINT'
        break;
      case STATES.GATE_CHECK:
        // Handled in external loop evaluating the gate
        break;
      case STATES.EPISODE_COMPLETE:
        this.context.currentEpisodeId = null;
        this.context.currentDifficulty = null;
        this.context.gateQuestionCount = 0;
        break;
    }

    eventBus.emit(EVENTS.STATE_CHANGED, {
      state: this.currentState,
      context: { ...this.context },
      payload
    });
  }

  getState() {
    return this.currentState;
  }

  getContext() {
    return { ...this.context };
  }

  loadState(savedState, savedContext) {
    if (savedState) {
      this.currentState = savedState;
    }
    if (savedContext) {
      this.context = { ...this.context, ...savedContext };
    }
    console.log(`[FSM] State loaded: ${this.currentState}`, this.context);
  }

  exportState() {
    return {
      state: this.currentState,
      context: { ...this.context }
    };
  }
}

// Singleton instance
export const fsm = new FSMEngine();
