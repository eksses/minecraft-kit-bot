import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContainer';
import {
  Card,
  Button,
  IconButton,
  Input,
  Select,
  Badge,
  Modal,
  SearchInput,
  Table,
  EmptyState,
  LoadingState,
  FormGroup,
  FormRow,
} from '../components/ui';
import {
  Box,
  MapPin,
  Clock,
  Shield,
  Sliders,
  RotateCcw,
  Trash2,
  Power,
  LayoutGrid,
  List,
  Package,
  Layers,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const RANK_OPTIONS = [
  { value: 'ALL', label: 'All Ranks' },
  { value: 'PUBLIC', label: 'Public' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'VIP', label: 'VIP' },
  { value: 'ADMIN', label: 'Admin' },
];

const RANK_SELECT_OPTIONS = [
  { value: 'public', label: 'Public (Everyone)' },
  { value: 'normal', label: 'Normal' },
  { value: 'vip', label: 'VIP' },
  { value: 'admin', label: 'Admin Only' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
];

export default function Chests() {
  const { addToast } = useToast();
  const [chests, setChests] = useState([]);
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [botFilter, setBotFilter] = useState('ALL');
  const [rankFilter, setRankFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modal / Form state
  const [editingChest, setEditingChest] = useState(null);
  const [savingRules, setSavingRules] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [ruleForm, setRuleForm] = useState({
    name: '',
    x: 0,
    y: 0,
    z: 0,
    minRank: 'public',
    cooldownMinutes: 0,
    maxDailyLimit: 0,
    maxHourlyLimit: 0,
    maxWithdrawPerOrder: 64,
    category: 'General',
    description: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [chestData, botData] = await Promise.all([
        api.chests.getAll().catch(() => []),
        api.fleet.getBots().catch(() => []),
      ]);
      setChests(Array.isArray(chestData) ? chestData : []);
      setBots(Array.isArray(botData) ? botData : []);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load chest locations', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Bot map for quick lookup
  const botMap = useMemo(() => {
    const map = new Map();
    bots.forEach(b => map.set(b.id, b.username || b.name || b.id));
    return map;
  }, [bots]);

  // Unique categories for filter dropdown
  const categoryOptions = useMemo(() => {
    const cats = new Set(['General']);
    chests.forEach(c => {
      if (c.category) cats.add(c.category);
    });
    return [
      { value: 'ALL', label: 'All Categories' },
      ...Array.from(cats).map(c => ({ value: c, label: c })),
    ];
  }, [chests]);

  // Bot filter options
  const botOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Bots' },
      ...bots.map(b => ({ value: b.id, label: b.username || b.name || b.id })),
    ];
  }, [bots]);

  // Filtered chests list
  const filteredChests = useMemo(() => {
    return chests.filter(c => {
      // Search text (name, item, coordinates)
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const coordsStr = `${c.x}, ${c.y}, ${c.z} ${c.x} ${c.y} ${c.z}`;
        const matchName = (c.name || '').toLowerCase().includes(query);
        const matchItem = (c.itemName || '').toLowerCase().includes(query);
        const matchCoords = coordsStr.includes(query);
        if (!matchName && !matchItem && !matchCoords) return false;
      }

      // Bot filter
      if (botFilter !== 'ALL' && c.botId !== botFilter) return false;

      // Rank filter
      if (rankFilter !== 'ALL' && (c.minRank || 'public').toUpperCase() !== rankFilter.toUpperCase()) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'ALL' && (c.category || 'General') !== categoryFilter) return false;

      // Status filter
      if (statusFilter !== 'ALL' && (c.status || 'ACTIVE').toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }

      return true;
    });
  }, [chests, search, botFilter, rankFilter, categoryFilter, statusFilter]);

  // Rank badge styling helper
  const getRankBadgeProps = (rank) => {
    const r = (rank || 'public').toLowerCase();
    switch (r) {
      case 'admin':
        return { label: 'ADMIN', className: 'bg-red-500/20 text-red-400 border border-red-500/30 font-semibold' };
      case 'vip':
        return { label: 'VIP', className: 'bg-purple-500/20 text-purple-400 border border-purple-500/30 font-semibold' };
      case 'normal':
        return { label: 'NORMAL', className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold' };
      case 'public':
      default:
        return { label: 'PUBLIC', className: 'bg-slate-500/20 text-slate-300 border border-slate-500/30 font-semibold' };
    }
  };

  // Open Rule Editor Modal
  const handleOpenEditModal = (chest) => {
    setEditingChest(chest);
    setRuleForm({
      name: chest.name || '',
      x: chest.x ?? 0,
      y: chest.y ?? 0,
      z: chest.z ?? 0,
      minRank: chest.minRank || 'public',
      cooldownMinutes: chest.cooldownMinutes ?? 0,
      maxDailyLimit: chest.maxDailyLimit ?? 0,
      maxHourlyLimit: chest.maxHourlyLimit ?? 0,
      maxWithdrawPerOrder: chest.maxWithdrawPerOrder ?? 64,
      category: chest.category || 'General',
      description: chest.description || '',
    });
  };

  // Save Rules Form
  const handleSaveRules = async (e) => {
    e.preventDefault();
    if (!editingChest) return;
    setSavingRules(true);
    try {
      // 1. Call updateRules API endpoint (Requirements 1 & 2)
      await api.chests.updateRules(editingChest.id, {
        minRank: ruleForm.minRank,
        cooldownMinutes: Number(ruleForm.cooldownMinutes),
        maxDailyLimit: Number(ruleForm.maxDailyLimit),
        maxHourlyLimit: Number(ruleForm.maxHourlyLimit),
        maxWithdrawPerOrder: Number(ruleForm.maxWithdrawPerOrder),
        category: ruleForm.category,
      });

      // 2. Call update API endpoint for name, coordinates, description
      await api.chests.update(editingChest.id, {
        name: ruleForm.name,
        x: Number(ruleForm.x),
        y: Number(ruleForm.y),
        z: Number(ruleForm.z),
        description: ruleForm.description,
        minRank: ruleForm.minRank,
        cooldownMinutes: Number(ruleForm.cooldownMinutes),
        maxDailyLimit: Number(ruleForm.maxDailyLimit),
        maxHourlyLimit: Number(ruleForm.maxHourlyLimit),
        maxWithdrawPerOrder: Number(ruleForm.maxWithdrawPerOrder),
        category: ruleForm.category,
      });

      addToast({ type: 'success', title: `Rules updated for "${ruleForm.name || 'Chest'}"` });
      setEditingChest(null);
      loadData();
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to update chest rules', message: err.message });
    } finally {
      setSavingRules(false);
    }
  };

  // Toggle Active / Disabled Status
  const handleToggleStatus = async (chest) => {
    const newStatus = (chest.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setActionLoading(prev => ({ ...prev, [`status-${chest.id}`]: true }));
    try {
      await api.chests.updateRules(chest.id, { status: newStatus });
      setChests(prev =>
        prev.map(c => (c.id === chest.id ? { ...c, status: newStatus } : c))
      );
      addToast({
        type: 'success',
        title: `Chest "${chest.name || 'Chest'}" is now ${newStatus}`,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to toggle chest status', message: err.message });
    } finally {
      setActionLoading(prev => ({ ...prev, [`status-${chest.id}`]: false }));
    }
  };

  // Reset Cooldowns
  const handleResetCooldowns = async (chest) => {
    setActionLoading(prev => ({ ...prev, [`reset-${chest.id}`]: true }));
    try {
      await api.chests.resetCooldowns(chest.id);
      addToast({
        type: 'success',
        title: `Cooldowns reset for "${chest.name || 'Chest'}"`,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to reset cooldowns', message: err.message });
    } finally {
      setActionLoading(prev => ({ ...prev, [`reset-${chest.id}`]: false }));
    }
  };

  // Delete Chest
  const handleDeleteChest = async (chest) => {
    if (!window.confirm(`Are you sure you want to delete chest "${chest.name || 'Unnamed'}"?`)) return;
    setActionLoading(prev => ({ ...prev, [`delete-${chest.id}`]: true }));
    try {
      await api.chests.delete(chest.id);
      setChests(prev => prev.filter(c => c.id !== chest.id));
      addToast({ type: 'success', title: `Chest "${chest.name || 'Chest'}" deleted` });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to delete chest', message: err.message });
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-${chest.id}`]: false }));
    }
  };

  if (loading) return <LoadingState text="Loading chest locations..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-mdb-text flex items-center gap-2.5">
            <Box size={24} className="text-mdb-primary" />
            Chest Management
          </h1>
          <p className="text-sm text-mdb-text-muted mt-1">
            Manage chest access rules, limits, cooldowns, and inventory allocations ({filteredChests.length} total)
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-mdb-surface border border-mdb-border rounded-xl p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-mdb-primary text-white shadow-sm'
                : 'text-mdb-text-muted hover:text-mdb-text hover:bg-mdb-surface-high'
            }`}
          >
            <LayoutGrid size={15} />
            Grid View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-mdb-primary text-white shadow-sm'
                : 'text-mdb-text-muted hover:text-mdb-text hover:bg-mdb-surface-high'
            }`}
          >
            <List size={15} />
            Dense Table
          </button>
        </div>
      </div>

      {/* Controls & Search Bar */}
      <Card padding="sm" className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="lg:col-span-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name, item, or X Y Z..."
            />
          </div>

          {/* Bot Filter */}
          <div className="lg:col-span-2">
            <Select
              options={botOptions}
              value={botFilter}
              onChange={(e) => setBotFilter(e.target.value)}
            />
          </div>

          {/* Rank Filter */}
          <div className="lg:col-span-2">
            <Select
              options={RANK_OPTIONS}
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-2">
            <Select
              options={categoryOptions}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Empty State */}
      {filteredChests.length === 0 ? (
        <EmptyState
          icon={Box}
          title="No chests found"
          description={
            search || botFilter !== 'ALL' || rankFilter !== 'ALL' || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No chests match your selected filter parameters.'
              : 'No chests have been discovered or created yet. Run a chest scan from a bot detail page.'
          }
        />
      ) : viewMode === 'grid' ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChests.map((chest) => {
            const isStatusDisabled = (chest.status || 'ACTIVE').toUpperCase() === 'DISABLED';
            const rankProps = getRankBadgeProps(chest.minRank);
            const botName = botMap.get(chest.botId) || chest.botId || 'Unassigned';

            return (
              <Card
                key={chest.id}
                padding="none"
                className={`flex flex-col transition-all duration-200 hover:border-mdb-border-hover ${
                  isStatusDisabled ? 'opacity-75 bg-mdb-surface/60' : ''
                }`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-mdb-border flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-semibold text-mdb-text truncate">
                        {chest.name || 'Unnamed Chest'}
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-mdb-surface-high text-mdb-text-muted border border-mdb-border">
                        {chest.category || 'General'}
                      </span>
                    </div>
                    {chest.description && (
                      <p className="text-xs text-mdb-text-muted line-clamp-1">
                        {chest.description}
                      </p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
                      isStatusDisabled
                        ? 'bg-mdb-error/15 text-mdb-error border border-mdb-error/30'
                        : 'bg-mdb-success/15 text-mdb-success border border-mdb-success/30'
                    }`}
                  >
                    {isStatusDisabled ? (
                      <>
                        <XCircle size={12} />
                        DISABLED
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} />
                        ACTIVE
                      </>
                    )}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3 flex-1 text-xs text-mdb-text-secondary">
                  {/* Location & Bot */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-mdb-bg border border-mdb-border text-mdb-text font-mono">
                      <MapPin size={13} className="text-mdb-primary shrink-0" />
                      ({chest.x}, {chest.y}, {chest.z})
                    </div>
                    <div className="text-mdb-text-muted text-[11px] flex items-center gap-1">
                      <Layers size={12} />
                      {botName}
                    </div>
                  </div>

                  {/* Item Info */}
                  <div className="flex items-center justify-between gap-2 bg-mdb-bg/50 p-2.5 rounded-lg border border-mdb-border/50">
                    <div className="flex items-center gap-2 truncate">
                      <Package size={14} className="text-mdb-primary shrink-0" />
                      <span className="font-medium text-mdb-text truncate">
                        {chest.itemName || 'Unknown Item'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] bg-mdb-surface-high font-mono font-bold text-mdb-text">
                      x{chest.itemCount ?? 0}
                    </span>
                  </div>

                  {/* Rank Badge */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-mdb-text-muted">Required Rank:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] ${rankProps.className}`}>
                      {rankProps.label}
                    </span>
                  </div>

                  {/* Cooldown & Limits summary badge */}
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-mdb-surface-high/60 border border-mdb-border/40 text-[11px] text-mdb-text-secondary">
                    <Clock size={13} className="text-mdb-text-muted shrink-0" />
                    <span>
                      Cooldown: <strong className="text-mdb-text">{chest.cooldownMinutes ?? 0}m</strong> | Max Daily: <strong className="text-mdb-text">{chest.maxDailyLimit ?? 0}</strong>
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-3 border-t border-mdb-border bg-mdb-surface-high/20 grid grid-cols-4 gap-1.5">
                  <IconButton
                    icon={Sliders}
                    size="sm"
                    tooltip="Edit Rules"
                    onClick={() => handleOpenEditModal(chest)}
                    className="w-full bg-mdb-surface hover:bg-mdb-surface-high border border-mdb-border"
                  />
                  <IconButton
                    icon={Power}
                    size="sm"
                    tooltip={isStatusDisabled ? 'Enable Chest' : 'Disable Chest'}
                    loading={actionLoading[`status-${chest.id}`]}
                    onClick={() => handleToggleStatus(chest)}
                    className={`w-full border border-mdb-border ${
                      isStatusDisabled
                        ? 'bg-mdb-success/10 text-mdb-success hover:bg-mdb-success/20'
                        : 'bg-mdb-surface text-mdb-text-secondary hover:bg-mdb-surface-high'
                    }`}
                  />
                  <IconButton
                    icon={RotateCcw}
                    size="sm"
                    tooltip="Reset Cooldowns"
                    loading={actionLoading[`reset-${chest.id}`]}
                    onClick={() => handleResetCooldowns(chest)}
                    className="w-full bg-mdb-surface hover:bg-mdb-surface-high border border-mdb-border"
                  />
                  <IconButton
                    icon={Trash2}
                    size="sm"
                    tooltip="Delete Chest"
                    loading={actionLoading[`delete-${chest.id}`]}
                    onClick={() => handleDeleteChest(chest)}
                    className="w-full bg-mdb-error/10 text-mdb-error hover:bg-mdb-error/20 border border-mdb-error/20"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Dense Table View */
        <Table
          columns={[
            {
              key: 'name',
              label: 'Chest Name & Category',
              render: (_, c) => (
                <div>
                  <div className="font-semibold text-mdb-text flex items-center gap-2">
                    {c.name || 'Unnamed Chest'}
                    <span className="px-1.5 py-0.2 text-[10px] rounded bg-mdb-surface-high text-mdb-text-muted">
                      {c.category || 'General'}
                    </span>
                  </div>
                  {c.description && <div className="text-xs text-mdb-text-muted truncate max-w-xs">{c.description}</div>}
                </div>
              ),
            },
            {
              key: 'location',
              label: 'Location (X, Y, Z)',
              render: (_, c) => (
                <span className="font-mono text-xs text-mdb-text bg-mdb-bg px-2 py-0.5 rounded border border-mdb-border">
                  {c.x}, {c.y}, {c.z}
                </span>
              ),
            },
            {
              key: 'item',
              label: 'Item & Count',
              render: (_, c) => (
                <div className="text-xs">
                  <span className="font-medium text-mdb-text">{c.itemName || 'Unknown'}</span>
                  <span className="ml-1 text-mdb-text-muted font-mono">x{c.itemCount ?? 0}</span>
                </div>
              ),
            },
            {
              key: 'minRank',
              label: 'Required Rank',
              render: (_, c) => {
                const rp = getRankBadgeProps(c.minRank);
                return <span className={`px-2 py-0.5 rounded-full text-[10px] ${rp.className}`}>{rp.label}</span>;
              },
            },
            {
              key: 'limits',
              label: 'Cooldown / Limits',
              render: (_, c) => (
                <div className="text-xs text-mdb-text-secondary whitespace-nowrap">
                  <span>{c.cooldownMinutes ?? 0}m cd</span> | <span>{c.maxDailyLimit ?? 0}/day</span>
                </div>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (_, c) => {
                const isDisabled = (c.status || 'ACTIVE').toUpperCase() === 'DISABLED';
                return (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      isDisabled ? 'bg-mdb-error/15 text-mdb-error' : 'bg-mdb-success/15 text-mdb-success'
                    }`}
                  >
                    {isDisabled ? 'DISABLED' : 'ACTIVE'}
                  </span>
                );
              },
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (_, c) => (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <IconButton icon={Sliders} size="sm" tooltip="Edit Rules" onClick={() => handleOpenEditModal(c)} />
                  <IconButton
                    icon={Power}
                    size="sm"
                    tooltip={(c.status || 'ACTIVE').toUpperCase() === 'DISABLED' ? 'Enable' : 'Disable'}
                    onClick={() => handleToggleStatus(c)}
                  />
                  <IconButton icon={RotateCcw} size="sm" tooltip="Reset Cooldowns" onClick={() => handleResetCooldowns(c)} />
                  <IconButton icon={Trash2} size="sm" tooltip="Delete" onClick={() => handleDeleteChest(c)} className="text-mdb-error hover:bg-mdb-error/20" />
                </div>
              ),
            },
          ]}
          data={filteredChests}
        />
      )}

      {/* Rule Editor Modal */}
      {editingChest && (
        <Modal
          isOpen={Boolean(editingChest)}
          onClose={() => setEditingChest(null)}
          title={`Edit Chest Rules — ${editingChest.name || 'Unnamed Chest'}`}
          size="lg"
        >
          <form onSubmit={handleSaveRules} className="space-y-4">
            <FormRow>
              <Input
                label="Chest Name"
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder="e.g. Diamond Kit Chest"
                required
              />
              <Input
                label="Category"
                value={ruleForm.category}
                onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })}
                placeholder="e.g. Kits, General, Building"
              />
            </FormRow>

            {/* Coordinates X, Y, Z */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-mdb-text-secondary block">
                Location Coordinates (X, Y, Z)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  type="number"
                  placeholder="X"
                  value={ruleForm.x}
                  onChange={(e) => setRuleForm({ ...ruleForm, x: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Y"
                  value={ruleForm.y}
                  onChange={(e) => setRuleForm({ ...ruleForm, y: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Z"
                  value={ruleForm.z}
                  onChange={(e) => setRuleForm({ ...ruleForm, z: e.target.value })}
                />
              </div>
            </div>

            {/* Rank Select */}
            <Select
              label="Minimum Required Rank"
              options={RANK_SELECT_OPTIONS}
              value={ruleForm.minRank}
              onChange={(e) => setRuleForm({ ...ruleForm, minRank: e.target.value })}
            />

            {/* Limits & Cooldowns */}
            <FormRow>
              <Input
                type="number"
                label="Cooldown (Minutes)"
                helperText="Wait time between claims"
                value={ruleForm.cooldownMinutes}
                onChange={(e) => setRuleForm({ ...ruleForm, cooldownMinutes: e.target.value })}
              />
              <Input
                type="number"
                label="Max Daily Limit"
                helperText="0 = Unlimited claims per day"
                value={ruleForm.maxDailyLimit}
                onChange={(e) => setRuleForm({ ...ruleForm, maxDailyLimit: e.target.value })}
              />
            </FormRow>

            <FormRow>
              <Input
                type="number"
                label="Max Hourly Limit"
                helperText="0 = Unlimited claims per hour"
                value={ruleForm.maxHourlyLimit}
                onChange={(e) => setRuleForm({ ...ruleForm, maxHourlyLimit: e.target.value })}
              />
              <Input
                type="number"
                label="Max Withdraw Per Order"
                helperText="Max items given in single trade"
                value={ruleForm.maxWithdrawPerOrder}
                onChange={(e) => setRuleForm({ ...ruleForm, maxWithdrawPerOrder: e.target.value })}
              />
            </FormRow>

            {/* Description */}
            <Input
              label="Description"
              value={ruleForm.description}
              onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
              placeholder="Optional notes or description for this chest location..."
            />

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-mdb-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingChest(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={savingRules}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
