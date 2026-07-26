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
  demo: { bg: 'var(--status-online)', color: '#000' },
  test: { bg: 'var(--status-warning)', color: '#000' },
  default: { bg: 'var(--bg-surface-high)', color: 'var(--text-muted)' },
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
    return <div className="loading-state">Loading plugin store...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header Banner */}
      <div style={{
        padding: '16px 24px',
        background: 'var(--bg-surface-low)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
              marginBottom: '4px',
            }}>SYSTEM STATUS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', background: 'var(--status-online)' }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: 'var(--status-online)' }}>
                CORE ENGINE: ONLINE
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
              marginBottom: '4px',
            }}>ACTIVE PLUGINS</div>
            <div style={{ fontSize: '24px', fontWeight: '600' }}>{installed.length}</div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          className={`tab-item ${activeTab === 'available' ? 'active' : ''}`}
          onClick={() => setActiveTab('available')}
        >
          <Package size={16} /> Available ({available.length})
        </button>
        <button
          className={`tab-item ${activeTab === 'installed' ? 'active' : ''}`}
          onClick={() => setActiveTab('installed')}
        >
          <Download size={16} /> Installed ({installed.length})
        </button>
        <button
          className={`tab-item ${activeTab === 'repos' ? 'active' : ''}`}
          onClick={() => setActiveTab('repos')}
        >
          <ShoppingCart size={16} /> Repos ({repos.length})
        </button>
      </div>

      {/* Available Plugins */}
      {activeTab === 'available' && (
        <div style={{ padding: '24px' }}>
          {/* Search Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 16px',
            height: '48px',
            background: 'var(--bg-surface-high)',
            border: '1px solid var(--border)',
            marginBottom: '16px',
          }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {filteredAvailable.length === 0 ? (
            <div className="empty-state">
              <Package size={48} />
              <div className="empty-state-title">No plugins found</div>
              <div className="empty-state-text">Check your repository configuration</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1px' }}>
              {filteredAvailable.map((plugin) => {
                const Icon = getIcon(plugin.category);
                const installed = isInstalled(plugin.id);
                return (
                  <div
                    key={plugin.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--status-online)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    {/* Icon + Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{
                        padding: '12px',
                        background: 'var(--bg-surface-high)',
                        border: '1px solid var(--border)',
                      }}>
                        <Icon size={32} style={{ color: 'var(--status-online)' }} />
                      </div>
                      {installed ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          background: 'var(--bg-surface-low)',
                          border: '1px solid var(--border)',
                        }}>
                          <div style={{ width: '6px', height: '6px', background: 'var(--status-online)' }} />
                          <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--status-online)' }}>
                            INSTALLED
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Name + Meta */}
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{plugin.name}</h3>
                      <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        v{plugin.version} • by {plugin.author || 'Unknown'}
                      </div>
                      <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '20px', marginBottom: '8px' }}>
                        {plugin.description}
                      </p>
                      {plugin.tags && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {plugin.tags.map((tag) => {
                            const ts = getTagStyle(tag);
                            return (
                              <span
                                key={tag}
                                style={{
                                  padding: '2px 8px',
                                  background: ts.bg,
                                  color: ts.color,
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  letterSpacing: '0.05em',
                                }}
                              >
                                {tag.toUpperCase()}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '4px' }}>
                      {installed ? (
                        <button
                          className="btn btn-sm"
                          style={{ flex: 1, height: '48px', opacity: 0.5, cursor: 'default' }}
                          disabled
                        >
                          <CheckCircle size={16} /> Installed
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, height: '48px' }}
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
                          className="btn btn-secondary btn-sm"
                          style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
        <div style={{ padding: '24px' }}>
          {installed.length === 0 ? (
            <div className="empty-state">
              <Package size={48} />
              <div className="empty-state-title">No plugins installed</div>
              <div className="empty-state-text">Browse the Available tab to install plugins</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1px' }}>
              {installed.map((plugin) => {
                const Icon = getIcon(plugin.category);
                return (
                  <div
                    key={plugin.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{
                        padding: '12px',
                        background: 'var(--bg-surface-high)',
                        border: '1px solid var(--border)',
                      }}>
                        <Icon size={32} style={{ color: 'var(--status-online)' }} />
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        background: 'var(--bg-surface-low)',
                        border: '1px solid var(--border)',
                      }}>
                        <div style={{ width: '6px', height: '6px', background: plugin.enabled ? 'var(--status-online)' : 'var(--text-muted)' }} />
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          letterSpacing: '0.05em',
                          color: plugin.enabled ? 'var(--status-online)' : 'var(--text-muted)',
                        }}>
                          {plugin.enabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{plugin.name}</h3>
                      <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                        v{plugin.version} • by {plugin.author || 'Unknown'}
                      </div>
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '4px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, height: '48px' }}
                      >
                        <Settings size={16} /> Settings
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ flex: 1, height: '48px' }}
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
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Repositories</h2>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setEditingRepo(null); setRepoForm({ name: '', url: '' }); setShowAddRepo(true); }}
              style={{ height: '48px' }}
            >
              <Plus size={16} /> Add Repository
            </button>
          </div>
          <div className="list">
            {repos.map((repo) => (
              <div className="list-item" key={repo.id}>
                <div className="list-item-info">
                  <div className="list-item-name">
                    {repo.name}
                    {!isCustomRepo(repo.id) && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '10px',
                        fontWeight: '700',
                        letterSpacing: '0.05em',
                        padding: '2px 8px',
                        background: 'var(--status-online)',
                        color: '#000',
                      }}>
                        OFFICIAL
                      </span>
                    )}
                  </div>
                  <div className="list-item-meta" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px' }}>
                    {repo.url}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {isCustomRepo(repo.id) && (
                    <>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEditRepo(repo)}>
                        <Settings size={14} /> Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleRemoveRepo(repo.id)}>
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
        <div className="drawer-overlay" onClick={() => { setShowAddRepo(false); setEditingRepo(null); }}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-title">{editingRepo ? 'Edit Repository' : 'Add Repository'}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddRepo(false); setEditingRepo(null); }}>✕</button>
            </div>
            <div className="drawer-body">
              <form onSubmit={handleAddRepo}>
                <div className="form-group">
                  <label className="form-label">NAME</label>
                  <input
                    type="text"
                    value={repoForm.name}
                    onChange={(e) => setRepoForm({ ...repoForm, name: e.target.value })}
                    placeholder="My Custom Repo"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">URL</label>
                  <input
                    type="url"
                    value={repoForm.url}
                    onChange={(e) => setRepoForm({ ...repoForm, url: e.target.value })}
                    placeholder="https://plugins.example.com/plugins.json"
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowAddRepo(false); setEditingRepo(null); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
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
