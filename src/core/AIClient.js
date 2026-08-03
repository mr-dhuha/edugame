import { supabase } from './SupabaseClient';

/**
 * AIClient acts as a secure bridge to the Supabase Edge Function `ai-tutor`
 * which securely holds the SumoPod API key.
 */
export const AIClient = {
  
  /**
   * Evaluates student reflection
   * @param {string} studentText - The reflection journal written by the student
   * @returns {Promise<{score: number, feedback: string}>}
   */
  async gradeReflection(studentText, context = '', studentName = 'Siswa') {
    if (!supabase) throw new Error("Supabase is not initialized");
    
    const { data, error } = await supabase.functions.invoke('ai-tutor', {
      body: { feature: 'grade_reflection', data: `${context ? `[Konteks: ${context}]\n` : ''}[Nama Siswa: ${studentName}]\n${studentText}` }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Conducts reflection chat with the tutor
   * @param {Array<{role: string, content: string}>} history 
   * @param {boolean} isFinalTurn
   * @returns {Promise<string>}
   */
  async chatReflection(history, isFinalTurn, studentName = 'Siswa') {
    if (!supabase) throw new Error("Supabase is not initialized");

    const { data, error } = await supabase.functions.invoke('ai-tutor', {
      body: { feature: 'chat_reflection', data: { history, isFinalTurn, studentName } }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Generates Teacher Dashboard AI Insights
   * @param {object} classData - Aggregated class metrics (heatmap, misconceptions)
   * @returns {Promise<{sentiment: string, adaptive: string}>}
   */
  async generateDashboardInsights(classData) {
    if (!supabase) throw new Error("Supabase is not initialized");
    
    const { data, error } = await supabase.functions.invoke('ai-tutor', {
      body: { feature: 'dashboard_insights', data: classData }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Generates a supportive, personalized adaptive hint
   * @param {string} question - The topic or question string
   * @param {string} wrongAnswer - What the student answered incorrectly
   * @returns {Promise<string>}
   */
  async generateAdaptiveHint(question, wrongAnswer) {
    if (!supabase) throw new Error("Supabase is not initialized");
    
    const { data, error } = await supabase.functions.invoke('ai-tutor', {
      body: { feature: 'adaptive_hint', data: { question, wrong_answer: wrongAnswer } }
    });

    if (error) throw error;
    return data; // Because adaptive_hint returns raw text string
  },

  /**
   * Generates evaluation message for Gate Screen
   * @param {string} difficulty - Current difficulty level
   * @param {boolean} isFailed - Whether the student failed or passed
   * @param {number} accuracy - The accuracy percentage
   * @returns {Promise<string>}
   */
  async evaluateGate(difficulty, isFailed, accuracy, mistakes = '') {
    if (!supabase) throw new Error("Supabase is not initialized");
    
    const { data, error } = await supabase.functions.invoke('ai-tutor', {
      body: { feature: 'evaluate_gate', data: { difficulty, isFailed, accuracy, mistakes } }
    });

    if (error) throw error;
    return data;
  }
};
