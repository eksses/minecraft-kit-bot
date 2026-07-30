import React, { useState, useEffect, useMemo } from 'react';
import { Truck, Search, Filter, Box } from 'lucide-react';
import { api } from '../services/api';
import DeliverModal from '../components/DeliverModal';

export default function DeliveryPage() {
  const [bots, setBots] = useState([]);
  const [chests, setChests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBot, setSelectedBot] = useState('all');

  const [modalState, setModalState] = useState({
    isOpen: false,
    chestName: '',
    botId: '',
  });

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

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleDeliverClick = (chest) => {
    setModalState({
      isOpen: true,
      chestName: chest.name || chest.itemName,
      botId: chest.botId,
    });
  };

  const handleCloseModal = () => {
    setModalState({ isOpen: false, chestName: '', botId: '' });
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Truck className="w-8 h-8 text-mdb-primary" />
        <h1 className="text-2xl font-bold text-mdb-text">Kit Delivery System</h1>
      </div>

      <div className="bg-mdb-surface border border-mdb-surface-high p-4 mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-mdb-text-muted" />
          <input
            type="text"
            placeholder="Search by chest or item name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-mdb-text-muted" />
          <select
            value={selectedBot}
            onChange={(e) => setSelectedBot(e.target.value)}
          >
            <option value="all">All Bots</option>
            {bots.map(bot => (
              <option key={bot.id} value={bot.id}>
                {bot.username || bot.name || bot.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-mdb-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredChests.map(chest => (
            <div key={chest.id || `${chest.botId}-${chest.x}-${chest.y}-${chest.z}`} className="bg-mdb-surface border border-mdb-surface-high p-4 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <span className="px-2 py-1 bg-mdb-primary/10 text-mdb-primary text-xs font-medium border border-mdb-primary/20">
                  {chest.name || 'Unnamed Chest'}
                </span>
                <span className="text-xs text-mdb-text-muted flex items-center gap-1">
                  <Box className="w-3 h-3" />
                  {chest.itemCount || 0}
                </span>
              </div>
              
              <div className="mb-4 flex-1">
                <h3 className="text-lg font-medium text-mdb-text mb-1 truncate">
                  {chest.itemName || 'Unknown Item'}
                </h3>
                <div className="text-sm text-mdb-text-muted space-y-1">
                  <p>Bot: <span className="text-mdb-text-secondary">{getBotName(chest.botId)}</span></p>
                  <p>Location: <span className="text-mdb-text-secondary font-mono text-xs">{chest.x}, {chest.y}, {chest.z}</span></p>
                </div>
              </div>

              <button
                onClick={() => handleDeliverClick(chest)}
                className="w-full py-2 bg-mdb-primary hover:bg-mdb-primary/80 text-mdb-on-primary font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" />
                Deliver Kit
              </button>
            </div>
          ))}
          {filteredChests.length === 0 && (
             <div className="col-span-full py-12 text-center text-mdb-text-muted bg-mdb-surface border border-mdb-surface-high">
               No chests found matching your criteria.
             </div>
          )}
        </div>
      )}

      <DeliverModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        chestName={modalState.chestName}
        botId={modalState.botId}
      />
    </div>
  );
}
