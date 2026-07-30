import { useState, useEffect } from 'react';
import { useToast } from '../components/ToastContainer';
import { api } from '../services/api';
import {
  Puzzle,
  Package,
  Download,
  Settings,
  Trash2,
  RefreshCw,
  ShoppingCart,
  CheckCircle,
  Plus,
  Search,
  ExternalLink,
} from 'lucide-react';

const CATEGORY_ICONS = {
  demo: Puzzle,
  utility: Package,
  default: Puzzle,
};

const TAG_COLORS = {
  demo: { bg: 'var(--color-mdb-online)', color: '#000' },
  test: { bg: 'var(--color-mdb-working)', color: '#000' },
  default: { bg: 'var(--color-mdb-surface-high)', color: 'var(--color-mdb-text-muted)' },
};

export default function PluginStore() {
  const { addToast } = useToast();
  const [available, setAvailable] = useState([]);
  const [installed, setInstalled] = useState([]);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [installing, setInstalling] = useState(null);
  const [uninstalling, setUninstalling] = useState(null);
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [editingRepo, setEditingRepo] = useState(null);
  const [repoForm, setRepoForm] = useState({ name: '', url: '' });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [availRes, instRes, repoRes] = await Promise.all([
        api.pluginStore.getAvailable(),
        api.pluginStore.getInstalled(),
        api.pluginStore.getRepos(),
      ]);
      setAvailable(availRes.plugins || []);
      setInstalled(instRes.plugins || []);
      setRepos(repoRes.repos || []);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load plugin store' });
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (pluginId) => {
    setInstalling(pluginId);
    try {
      const plugin = available.find(p => p.id === pluginId);
      await api.pluginStore.install(pluginId, plugin?.downloadUrl);
      addToast({ type: 'success', title: `Installed ${pluginId}` });
      await loadAll();
    } catch (err) {
      addToast({ type: 'error', title: `Failed to install: ${err.message}` });
    } finally {
      setInstalling(null);
    }
  };

  const handleUninstall = async (pluginId) => {
    if (!confirm(`Uninstall ${pluginId}?`)) return;
    setUninstalling(pluginId);
    try {
      await api.pluginStore.uninstall(pluginId);
      addToast({ type: 'success', title: `Uninstalled ${pluginId}` });
      await loadAll();
    } catch (err) {
      addToast({ type: 'error', title: `Failed to uninstall: ${err.message}` });
    } finally {
      setUninstalling(null);
    }
  };

  const handleAddRepo = async (e) => {
    e.preventDefault();
    try {
      if (editingRepo) {
        await fetch(`/api/plugin-store/repos/${editingRepo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(repoForm),
          credentials: 'include',
        });
        addToast({ type: 'success', title: 'Repository updated' });
      } else {
        await api.pluginStore.addRepo(repoForm.name, repoForm.url);
        addToast({ type: 'success', title: 'Repository added' });
      }
      setShowAddRepo(false);
      setEditingRepo(null);
      setRepoForm({ name: '', url: '' });
      await loadAll();
    } catch (err) {
      addToast({ type: 'error', title: `Failed: ${err.message}` });
    }
  };

  const handleRemoveRepo = async (repoId) => {
    if (!confirm('Remove this repository?')) return;
    try {
      await api.pluginStore.removeRepo(repoId);
      addToast({ type: 'success', title: 'Repository removed' });
      await loadAll();
    } catch (err) {
      addToast({ type: 'error', title: `Failed: ${err.message}` });
    }
  };

  const handleEditRepo = (repo) => {
    setEditingRepo(repo);
    setRepoForm({ name: repo.name, url: repo.url });
    setShowAddRepo(true);
  };

  const isInstalled = (pluginId) => installed.some((p) => p.id === pluginId);
  const isCustomRepo = (repoId) => repoId !== 'official';

  const filteredAvailable = available.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTagStyle = (tag) => TAG_COLORS[tag] || TAG_COLORS.default;
  const getIcon = (category) => CATEGORY_ICONS[category] || CATEGORY_ICONS.default;

  if (loading) {
    return <div className="p-12 text-center text-mdb-text-muted">Loading plugin store...</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header Banner */}
      <div className="px-6 py-4 bg-mdb-surface-low border-b border-mdb-outline-variant">
        <div className="flex justify-between items-end">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-mdb-text-muted mb-1">SYSTEM STATUS</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-mdb-online" />
              <span className="font-mono text-[13px] text-mdb-online">CORE ENGINE: ONLINE</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold tracking-wider text-mdb-text-muted mb-1">ACTIVE PLUGINS</div>
            <div className="text-2xl font-semibold">{installed.length}</div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-0 border-b border-mdb-outline-variant mb-6">
        <button
          className={`px-4 h-12 flex items-center text-sm font-medium transition-all border-b-2 ${activeTab === 'available' ? 'text-mdb-primary border-b-mdb-primary' : 'text-mdb-text-muted border-b-transparent hover:text-mdb-text'}`}
          onClick={() => setActiveTab('available')}
        >
          <Package size={16} className="mr-2" /> Available ({available.length})
        </button>
        <button
          className={`px-4 h-12 flex items-center text-sm font-medium transition-all border-b-2 ${activeTab === 'installed' ? 'text-mdb-primary border-b-mdb-primary' : 'text-mdb-text-muted border-b-transparent hover:text-mdb-text'}`}
          onClick={() => setActiveTab('installed')}
        >
          <Download size={16} className="mr-2" /> Installed ({installed.length})
        </button>
        <button
          className={`px-4 h-12 flex items-center text-sm font-medium transition-all border-b-2 ${activeTab === 'repos' ? 'text-mdb-primary border-b-mdb-primary' : 'text-mdb-text-muted border-b-transparent hover:text-mdb-text'}`}
          onClick={() => setActiveTab('repos')}
        >
          <ShoppingCart size={16} className="mr-2" /> Repos ({repos.length})
        </button>
      </div>

      {/* Available Plugins */}
      {activeTab === 'available' && (
        <div className="p-6">
          {/* Search Bar */}
          <div className="flex items-center gap-2 px-4 h-12 bg-mdb-surface-high border border-mdb-outline-variant mb-4">
            <Search size={16} className="text-mdb-text-muted" />
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none text-mdb-text text-sm outline-none"
            />
          </div>

          {filteredAvailable.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-mdb-text-muted text-center">
              <Package size={48} />
              <div className="text-lg font-semibold mt-4 mb-2">No plugins found</div>
              <div className="text-sm">Check your repository configuration</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px">
              {filteredAvailable.map((plugin) => {
                const Icon = getIcon(plugin.category);
                const installedPlugin = isInstalled(plugin.id);
                return (
                  <div
                    key={plugin.id}
                    className="bg-mdb-surface border border-mdb-outline-variant p-4 flex flex-col gap-4 transition-[border-color] hover:border-mdb-online"
                  >
                    {/* Icon + Status */}
                    <div className="flex justify-between items-start">
                      <div className="p-3 bg-mdb-surface-high border border-mdb-outline-variant">
                        <Icon size={32} className="text-mdb-online" />
                      </div>
                      {installedPlugin && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-mdb-surface-low border border-mdb-outline-variant">
                          <div className="w-1.5 h-1.5 bg-mdb-online" />
                          <span className="text-[10px] font-bold tracking-wider text-mdb-online">INSTALLED</span>
                        </div>
                      )}
                    </div>

                    {/* Name + Meta */}
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{plugin.name}</h3>
                      <div className="text-[11px] font-bold tracking-wider text-mdb-text-muted mb-2">
                        v{plugin.version} • by {plugin.author || 'Unknown'}
                      </div>
                      <p className="text-sm text-mdb-text-muted leading-5 mb-2">
                        {plugin.description}
                      </p>
                      {plugin.tags && (
                        <div className="flex gap-1.5 flex-wrap">
                          {plugin.tags.map((tag) => {
                            const ts = getTagStyle(tag);
                            return (
                              <span
                                key={tag}
                                className="px-2 py-0.5 text-[10px] font-bold tracking-wider"
                                style={{ background: ts.bg, color: ts.color }}
                              >
                                {tag.toUpperCase()}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-auto pt-4 border-t border-mdb-outline-variant flex gap-1">
                      {installedPlugin ? (
                        <button
                          className="flex-1 h-12 text-xs font-bold opacity-50 cursor-default bg-mdb-surface-high border border-mdb-outline-variant"
                          disabled
                        >
                          <CheckCircle size={16} className="mr-2" /> Installed
                        </button>
                      ) : (
                        <button
                          className="flex-1 h-12 text-xs font-bold bg-mdb-primary text-mdb-on-primary flex items-center justify-center gap-2"
                          onClick={() => handleInstall(plugin.id)}
                          disabled={installing === plugin.id}
                        >
                          {installing === plugin.id ? 'Installing...' : <><Download size={16} /> Install</>}
                        </button>
                      )}
                      {plugin.homepage && (
                        <a
                          href={plugin.homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-12 h-12 border-2 border-mdb-primary text-mdb-primary bg-transparent hover:bg-mdb-surface-high"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Installed Plugins */}
      {activeTab === 'installed' && (
        <div className="p-6">
          {installed.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-mdb-text-muted text-center">
              <Package size={48} />
              <div className="text-lg font-semibold mt-4 mb-2">No plugins installed</div>
              <div className="text-sm">Browse the Available tab to install plugins</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px">
              {installed.map((plugin) => {
                const Icon = getIcon(plugin.category);
                return (
                  <div
                    key={plugin.id}
                    className="bg-mdb-surface border border-mdb-outline-variant p-4 flex flex-col gap-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="p-3 bg-mdb-surface-high border border-mdb-outline-variant">
                        <Icon size={32} className="text-mdb-online" />
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-mdb-surface-low border border-mdb-outline-variant">
                        <div className={`w-1.5 h-1.5 ${plugin.enabled ? 'bg-mdb-online' : 'bg-mdb-text-muted'}`} />
                        <span className={`text-[10px] font-bold tracking-wider ${plugin.enabled ? 'text-mdb-online' : 'text-mdb-text-muted'}`}>
                          {plugin.enabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{plugin.name}</h3>
                      <div className="text-[11px] font-bold tracking-wider text-mdb-text-muted">
                        v{plugin.version} • by {plugin.author || 'Unknown'}
                      </div>
                    </div>
                    <div className="mt-auto pt-4 border-t border-mdb-outline-variant flex gap-1">
                      <button
                        className="flex-1 h-12 text-xs font-bold border-2 border-mdb-primary text-mdb-primary bg-transparent hover:bg-mdb-surface-high flex items-center justify-center gap-2"
                      >
                        <Settings size={16} /> Settings
                      </button>
                      <button
                        className="flex-1 h-12 text-xs font-bold border-2 border-mdb-status-error text-mdb-status-error hover:bg-mdb-status-error/10 flex items-center justify-center gap-2"
                        onClick={() => handleUninstall(plugin.id)}
                        disabled={uninstalling === plugin.id}
                      >
                        {uninstalling === plugin.id ? 'Removing...' : <><Trash2 size={16} /> Uninstall</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Repositories */}
      {activeTab === 'repos' && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Repositories</h2>
            <button
              className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary"
              onClick={() => { setEditingRepo(null); setRepoForm({ name: '', url: '' }); setShowAddRepo(true); }}
            >
              <Plus size={16} /> Add Repository
            </button>
          </div>
          <div>
            {repos.map((repo) => (
              <div key={repo.id} className="flex items-center justify-between px-4 h-12 border-b border-mdb-outline-variant">
                <div className="flex items-center gap-2">
                  <div className="font-semibold">
                    {repo.name}
                    {!isCustomRepo(repo.id) && (
                      <span className="ml-2 text-[10px] font-bold tracking-wider px-2 py-0.5 bg-mdb-online text-black">
                        OFFICIAL
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[13px] text-mdb-text-muted">
                    {repo.url}
                  </div>
                </div>
                <div className="flex gap-1">
                  {isCustomRepo(repo.id) && (
                    <>
                      <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold border-2 border-mdb-primary text-mdb-primary bg-transparent hover:bg-mdb-surface-high" onClick={() => handleEditRepo(repo)}>
                        <Settings size={14} /> Edit
                      </button>
                      <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold border-2 border-mdb-status-error text-mdb-status-error hover:bg-mdb-status-error/10" onClick={() => handleRemoveRepo(repo.id)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Repository Drawer */}
      {showAddRepo && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-stretch justify-end" onClick={() => { setShowAddRepo(false); setEditingRepo(null); }}>
          <div className="w-full max-w-[480px] bg-mdb-surface border-l border-mdb-surface-high flex flex-col overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-mdb-surface-high">
              <span className="text-lg font-bold">{editingRepo ? 'Edit Repository' : 'Add Repository'}</span>
              <button className="inline-flex items-center gap-2 h-9 px-3 text-xs font-bold text-mdb-text-secondary hover:text-mdb-primary hover:bg-mdb-surface-high" onClick={() => { setShowAddRepo(false); setEditingRepo(null); }}>X</button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <form onSubmit={handleAddRepo}>
                <div className="mb-4">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">NAME</label>
                  <input
                    type="text"
                    value={repoForm.name}
                    onChange={(e) => setRepoForm({ ...repoForm, name: e.target.value })}
                    placeholder="My Custom Repo"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mdb-text-muted mb-1.5">URL</label>
                  <input
                    type="url"
                    value={repoForm.url}
                    onChange={(e) => setRepoForm({ ...repoForm, url: e.target.value })}
                    placeholder="https://plugins.example.com/plugins.json"
                    required
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="button" className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold border-2 border-mdb-primary text-mdb-primary bg-transparent hover:bg-mdb-surface-high" onClick={() => { setShowAddRepo(false); setEditingRepo(null); }}>
                    Cancel
                  </button>
                  <button type="submit" className="inline-flex items-center gap-2 h-12 px-5 text-sm font-bold bg-mdb-primary text-mdb-on-primary">
                    {editingRepo ? 'Update Repository' : 'Add Repository'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
