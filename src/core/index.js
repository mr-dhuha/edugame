import { AnalyticsEngine } from './AnalyticsEngine';
import { playerModel } from './PlayerModel';
import { supabase } from './SupabaseClient';

// Export a singleton instance of the analytics engine connected to our supabase client and player model
export const analyticsEngine = new AnalyticsEngine(playerModel, supabase);
