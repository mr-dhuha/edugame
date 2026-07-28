/**
 * EventBus - Pub/Sub event system for ChemQuest.
 * 
 * All significant game events flow through here so that engines
 * (XP, Badge, Mastery, Analytics) can subscribe independently
 * without coupling to each other.
 * 
 * Usage:
 *   import { eventBus, EVENTS } from './EventBus';
 *   
 *   // Subscribe
 *   const unsub = eventBus.on(EVENTS.QUESTION_ANSWERED, (payload) => { ... });
 *   
 *   // Publish
 *   eventBus.emit(EVENTS.QUESTION_ANSWERED, { questionId: 'E1-E-01', ... });
 *   
 *   // Cleanup
 *   unsub();
 */

export const EVENTS = Object.freeze({
  // Game flow
  GAME_INITIALIZED: 'GAME_INITIALIZED',
  STATE_CHANGED: 'STATE_CHANGED',

  // Question lifecycle
  QUESTION_STARTED: 'QUESTION_STARTED',
  QUESTION_ANSWERED: 'QUESTION_ANSWERED',
  CONFIDENCE_SELECTED: 'CONFIDENCE_SELECTED',
  HINT_SHOWN: 'HINT_SHOWN',

  // Adaptive logic
  MISCONCEPTION_DETECTED: 'MISCONCEPTION_DETECTED',
  GATE_EVALUATED: 'GATE_EVALUATED',
  ADAPTIVE_ACTION: 'ADAPTIVE_ACTION',

  // Player model
  MASTERY_UPDATED: 'MASTERY_UPDATED',
  XP_AWARDED: 'XP_AWARDED',
  BADGE_UNLOCKED: 'BADGE_UNLOCKED',

  // Episode lifecycle
  EPISODE_STARTED: 'EPISODE_STARTED',
  EPISODE_COMPLETED: 'EPISODE_COMPLETED',
  REFLECTION_SUBMITTED: 'REFLECTION_SUBMITTED',

  // Persistence
  SAVE_TRIGGERED: 'SAVE_TRIGGERED',
  DATA_LOADED: 'DATA_LOADED',
});

class EventBusImpl {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
    /** @type {Array<{event: string, payload: any, timestamp: number}>} */
    this._history = [];
    this._maxHistory = 500;
  }

  /**
   * Subscribe to an event.
   * @param {string} event - Event name from EVENTS enum.
   * @param {Function} callback - Handler function.
   * @returns {Function} Unsubscribe function.
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      const set = this._listeners.get(event);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this._listeners.delete(event);
        }
      }
    };
  }

  /**
   * Emit an event with payload.
   * @param {string} event - Event name.
   * @param {any} payload - Event data.
   */
  emit(event, payload = {}) {
    const entry = {
      event,
      payload,
      timestamp: Date.now(),
    };

    // Store in history for debugging/analytics
    this._history.push(entry);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }

    // Notify all subscribers
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(payload);
        } catch (err) {
          console.error(`[EventBus] Error in handler for ${event}:`, err);
        }
      }
    }
  }

  /**
   * Subscribe to an event, but auto-unsubscribe after one call.
   * @param {string} event 
   * @param {Function} callback 
   * @returns {Function} Unsubscribe function (in case you want to cancel before it fires).
   */
  once(event, callback) {
    const unsub = this.on(event, (payload) => {
      unsub();
      callback(payload);
    });
    return unsub;
  }

  /**
   * Remove all listeners (e.g. on game reset).
   */
  clear() {
    this._listeners.clear();
  }

  /**
   * Get event history for debugging or analytics export.
   * @param {string} [eventFilter] - Optional event name to filter by.
   * @returns {Array}
   */
  getHistory(eventFilter) {
    if (eventFilter) {
      return this._history.filter((e) => e.event === eventFilter);
    }
    return [...this._history];
  }

  /**
   * Get count of listeners for a specific event (for testing).
   * @param {string} event 
   * @returns {number}
   */
  listenerCount(event) {
    const set = this._listeners.get(event);
    return set ? set.size : 0;
  }
}

// Singleton instance
export const eventBus = new EventBusImpl();
