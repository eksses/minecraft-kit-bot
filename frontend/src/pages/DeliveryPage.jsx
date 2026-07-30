import React, { useState, useEffect, useMemo } from 'react';
import { Truck, Search, Filter, Box, Package } from 'lucide-react';
import { api } from '../services/api';
import DeliverModal from '../components/DeliverModal';

export default function DeliveryPage() {
  const [bots, setBots] = useState([]);
  const [chests, setChests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBot, setSelectedBot] = useState('all');
  const [modalState, setModalState] = useState({ isOpen: false, chestName: '', botId: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fetchedBots, fetchedChests] = await Promise.all([
        api.fleet.getBots(),
        api.fleet.getChests(),
      ]);
      setBots(fetchedBots);
      setChests(fetchedChests);
    } catch (error) {
      console.error('Failed to fetch delivery data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredChests = useMemo(() => {
    return chests.filter(chest => {
      const matchesSearch =
        chest.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chest.itemName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBot = selectedBot === 'all' || chest.botId === selectedBot;
      return matchesSearch && matchesBot;
    });
  }, [chests, searchQuery, selectedBot]);

  const getBotName = (botId) => {
    const bot = bots.find(b => b.id === botId);
    return bot ? (bot.username || bot.name || botId) : botId;
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-mdb-primary/10 border border-mdb-primary/20 flex items-center justify-center">
          <Truck size={20} className="text-mdb-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-mdb-text tracking-tight">Kit Delivery System</h1>
          <p className="text-sm text-mdb-text-muted mt-0.5">Browse chests and deliver kits to players</p>
        </div>
      </div>

      <div className="bg-mdb-surface rounded-xl border border-mdb-border p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mdb-text-muted" />
          <input
            type="text"
            placeholder="Search by chest or item name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative min-w-[180px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mdb-text-muted" />
          <select
            value={selectedBot}
            onChange={(e) => setSelectedBot(e.target.value)}
            className="pl-9"
          >
            <option value="all">All Bots</option>
            {bots.map(bot => (
              <option key={bot.id} value={bot.id}>{bot.username || bot.name || bot.id}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-mdb-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredChests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-mdb-text-muted">
          <Box size={48} className="mb-4 opacity-30" />
          <div className="text-lg font-medium mb-1 text-mdb-text">No chests found</div>
          <div className="text-sm">No chests match your search criteria</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredChests.map(chest => (
            <div key={chest.id || `${chest.botId}-${chest.x}-${chest.y}-${chest.z}`} className="bg-mdb-surface rounded-xl border border-mdb-border p-4 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-mdb-primary/10 text-mdb-primary border border-mdb-primary/20">
                  {chest.name || 'Unnamed'}
                </span>
                <span className="text-xs text-mdb-text-muted inline-flex items-center gap-1">
                  <Package size={12} />
                  {chest.itemCount || 0}
                </span>
              </div>

              <div className="mb-4 flex-1">
                <h3 className="text-sm font-medium text-mdb-text mb-1 truncate">{chest.itemName || 'Unknown Item'}</h3>
                <div className="text-xs text-mdb-text-muted space-y-0.5">
                  <p>Bot: <span className="text-mdb-text-secondary">{getBotName(chest.botId)}</span></p>
                  <p className="font-mono">{chest.x}, {chest.y}, {chest.z}</p>
                </div>
              </div>

              <button
                onClick={() => setModalState({ isOpen: true, chestName: chest.name || chest.itemName, botId: chest.botId })}
                className="w-full h-9 rounded-lg bg-mdb-primary hover:bg-mdb-primary-hover text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Truck size={14} /> Deliver
              </button>
            </div>
          ))}
        </div>
      )}

      <DeliverModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, chestName: '', botId: '' })}
        chestName={modalState.chestName}
        botId={modalState.botId}
      />
    </div>
  );
}
