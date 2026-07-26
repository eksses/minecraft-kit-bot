import { useState, useEffect } from 'react';
import { useToast } from '../components/ToastContainer';
import { api } from '../services/api';

export default function PluginStore() {
  const { addToast } = useToast();
  const [available, setAvailable] = useState([]);
  const [installed, setInstalled] = useState([]);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [repoForm, setRepoForm] = useState({ name: '', url: '' });
  const [installing, setInstalling] = useState(null);
  const [uninstalling, setUninstalling] = useState(null);

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
      await api.pluginStore.install(pluginId);
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
      await api.pluginStore.addRepo(repoForm.name, repoForm.url);
      setShowAddRepo(false);
      setRepoForm({ name: '', url: '' });
      addToast({ type: 'success', title: 'Repository added' });
      await loadAll();
    } catch (err) {
      addToast({ type: 'error', title: `Failed to add repo: ${err.message}` });
    }
  };

  const handleRemoveRepo = async (repoId) => {
    if (!confirm('Remove this repository?')) return;
    try {
      await api.pluginStore.removeRepo(repoId);
      addToast({ type: 'success', title: 'Repository removed' });
      await loadAll();
    } catch (err) {
      addToast({ type: 'error', title: `Failed to remove repo: ${err.message}` });
    }
  };

  const isInstalled = (pluginId) => installed.some((p) => p.id === pluginId);

  if (loading) {
    return <div className="loading-state">Loading plugin store...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Plugin Store</h1>
          <p className="page-subtitle">Browse, install, and manage plugins</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
        <button
          className={`tab-item ${activeTab === 'available' ? 'active' : ''}`}
          onClick={() => setActiveTab('available')}
        >
          Available ({available.length})
        </button>
        <button
          className={`tab-item ${activeTab === 'installed' ? 'active' : ''}`}
          onClick={() => setActiveTab('installed')}
        >
          Installed ({installed.length})
        </button>
        <button
          className={`tab-item ${activeTab === 'repos' ? 'active' : ''}`}
          onClick={() => setActiveTab('repos')}
        >
          Repositories ({repos.length})
        </button>
      </div>

      {/* Available Plugins */}
      {activeTab === 'available' && (
        <div className="section">
          <div className="section-header">Available Plugins</div>
          {available.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No plugins available</div>
              <div className="empty-state-text">Check your repository configuration</div>
            </div>
          ) : (
            <div className="list">
              {available.map((plugin) => (
                <div className="list-item" key={plugin.id}>
                  <div className="list-item-info">
                    <div className="list-item-name">{plugin.name}</div>
                    <div className="list-item-meta">
                      v{plugin.version} by {plugin.author} · {plugin.downloads} downloads
                    </div>
                    <div className="list-item-meta">{plugin.description}</div>
                    {plugin.tags && (
                      <div className="list-item-meta">
                        {plugin.tags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              marginRight: '6px',
                              background: 'var(--bg-surface-high)',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    {isInstalled(plugin.id) ? (
                      <span className="btn btn-sm" style={{ opacity: 0.5, cursor: 'default' }}>
                        Installed
                      </span>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleInstall(plugin.id)}
                        disabled={installing === plugin.id}
                      >
                        {installing === plugin.id ? 'Installing...' : 'Install'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Installed Plugins */}
      {activeTab === 'installed' && (
        <div className="section">
          <div className="section-header">Installed Plugins</div>
          {installed.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No plugins installed</div>
              <div className="empty-state-text">Browse the Available tab to install plugins</div>
            </div>
          ) : (
            <div className="list">
              {installed.map((plugin) => (
                <div className="list-item" key={plugin.id}>
                  <div className="list-item-info">
                    <div className="list-item-name">
                      {plugin.name}
                      <span
                        style={{
                          marginLeft: '8px',
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: plugin.enabled ? 'var(--status-online)' : 'var(--bg-surface-high)',
                          color: plugin.enabled ? '#000' : 'var(--text-muted)',
                        }}
                      >
                        {plugin.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="list-item-meta">
                      v{plugin.version} by {plugin.author}
                    </div>
                    {plugin.description && (
                      <div className="list-item-meta">{plugin.description}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleUninstall(plugin.id)}
                      disabled={uninstalling === plugin.id}
                    >
                      {uninstalling === plugin.id ? 'Removing...' : 'Uninstall'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Repositories */}
      {activeTab === 'repos' && (
        <div className="section">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Repositories</span>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddRepo(true)}>
              Add Repository
            </button>
          </div>
          <div className="list">
            {repos.map((repo) => (
              <div className="list-item" key={repo.id}>
                <div className="list-item-info">
                  <div className="list-item-name">{repo.name}</div>
                  <div className="list-item-meta">{repo.url}</div>
                </div>
                <div>
                  {repo.id !== 'official' && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemoveRepo(repo.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Repository Drawer */}
      {showAddRepo && (
        <div className="drawer-overlay" onClick={() => setShowAddRepo(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-title">Add Repository</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddRepo(false)}>
                ✕
              </button>
            </div>
            <div className="drawer-body">
              <form onSubmit={handleAddRepo}>
                <div className="form-group">
                  <label className="form-label">Name</label>
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
                    placeholder="https://plugins.example.com"
                    required
                  />
                </div>
                <div className="flex gap-sm mt-md">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddRepo(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Repository
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
