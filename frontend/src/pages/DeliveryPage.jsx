import { useState, useEffect, useMemo } from 'react';
import { Truck, Package, MapPin, Bot } from 'lucide-react';
import { api } from '../services/api';
import DeliverModal from '../components/DeliverModal';
import { Card, Button, SearchInput, Select, EmptyState, LoadingState, Badge } from '../components/ui';

export default function DeliveryPage() {
  const [bots, setBots] = useState([]);
  const [chests, setChests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [botFilter, setBotFilter] = useState('all');
  const [deliver, setDeliver] = useState(null);

  useEffect(() => {
    Promise.all([api.fleet.getBots(), api.fleet.getChests()])
      .then(([b, c]) => { setBots(b); setChests(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return chests.filter(c => {
      const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.itemName?.toLowerCase().includes(search.toLowerCase());
      const matchBot = botFilter === 'all' || c.botId === botFilter;
      return matchSearch && matchBot;
    });
  }, [chests, search, botFilter]);

  const botName = (id) => bots.find(b => b.id === id)?.name || id;

  if (loading) return <LoadingState text="Loading chests..." />;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-mdb-primary/10 flex items-center justify-center">
          <Truck size={20} className="text-mdb-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-mdb-text">Deliver</h1>
          <p className="text-sm text-mdb-text-muted">{filtered.length} chests available</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Search chests..." className="flex-1" />
        <Select
          value={botFilter}
          onChange={(e) => setBotFilter(e.target.value)}
          options={[{ value: 'all', label: 'All Bots' }, ...bots.map(b => ({ value: b.id, label: b.name }))]}
          className="w-full sm:w-40"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="No chests" description="No chests found. Run a chest scan from a bot first." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((chest, i) => (
            <Card key={chest.id || i} padding="none">
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-mdb-surface-high flex items-center justify-center shrink-0">
                      <Package size={14} className="text-mdb-text-muted" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-mdb-text truncate">{chest.name || 'Unnamed'}</p>
                      <p className="text-xs text-mdb-text-muted truncate">{chest.itemName || 'Unknown'}</p>
                    </div>
                  </div>
                  <Badge variant="default" size="sm">{chest.itemCount || 0}</Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-mdb-text-muted mt-3 pt-3 border-t border-mdb-border">
                  <span className="flex items-center gap-1">
                    <Bot size={12} />
                    {botName(chest.botId)}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <MapPin size={12} />
                    {chest.x}, {chest.y}, {chest.z}
                  </span>
                </div>
              </div>

              <div className="px-4 pb-4">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => setDeliver({ chestName: chest.name || chest.itemName, botId: chest.botId })}
                >
                  <Truck size={14} />
                  Deliver
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {deliver && (
        <DeliverModal
          isOpen={!!deliver}
          onClose={() => setDeliver(null)}
          chestName={deliver.chestName}
          botId={deliver.botId}
          onDeliverSuccess={() => { api.fleet.getChests().then(setChests).catch(() => {}); }}
        />
      )}
    </div>
  );
}
