import { useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function useRealtime(botIds = [], swarmIds = []) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    api.realtime.connect(user.id);

    const botKey = botIds.join(',');
    const swarmKey = swarmIds.join(',');

    // Subscribe to bots
    const currentBots = botKey ? botKey.split(',') : [];
    currentBots.forEach(id => api.realtime.subscribeBot(id));

    // Subscribe to swarms
    const currentSwarms = swarmKey ? swarmKey.split(',') : [];
    currentSwarms.forEach(id => api.realtime.subscribeSwarm(id));

    return () => {
      currentBots.forEach(id => api.realtime.unsubscribeBot(id));
      currentSwarms.forEach(id => api.realtime.unsubscribeSwarm(id));
    };
  }, [user?.id, botIds.join(','), swarmIds.join(',')]);

  return api.realtime;
}
