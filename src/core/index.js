import { AnalyticsEngine } from './AnalyticsEngine';
import { playerModel } from './PlayerModel';
import { supabase } from './SupabaseClient';
import { audioEngine } from './AudioEngine';

// Export a singleton instance of the analytics engine connected to our supabase client and player model
export const analyticsEngine = new AnalyticsEngine(playerModel, supabase);

export { audioEngine };
