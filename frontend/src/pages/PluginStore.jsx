import { useState, useEffect } from 'react';
import { useToast } from '../components/ToastContainer';
import { api } from '../services/api';
import {
  Puzzle,
  Package,
  Download,
  Settings,
  Trash2,
  ShoppingCart,
  CheckCircle,
  Plus,
  ExternalLink,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Tabs,
  SearchInput,
  Drawer,
  Input,
  ConfirmAction,
  EmptyState,
  LoadingState,
  LiveStatusDot,
} from '../components/ui';

const CATEGORY_ICONS = {
  demo: Puzzle,
  utility: Package,
  default: Puzzle,
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
      const plugin = available.find((p) => p.id === pluginId);
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
        await api.pluginStore.updateRepo(editingRepo.id, repoForm);
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

  const getIcon = (category) => CATEGORY_ICONS[category] || CATEGORY_ICONS.default;

  if (loading) {
    return <LoadingState text="Loading plugin store..." className="py-20" />;
  }

  const STORE_TABS = [
    { id: 'available', label: `Available (${available.length})`, icon: Package },
    { id: 'installed', label: `Installed (${installed.length})`, icon: Download },
    { id: 'repos', label: `Repos (${repos.length})`, icon: ShoppingCart },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <Card padding="md" className="bg-mdb-surface border border-mdb-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted mb-1">
              SYSTEM STATUS
            </div>
            <div className="flex items-center gap-2">
              <LiveStatusDot status="online" />
              <span className="font-mono text-sm font-semibold text-mdb-success">CORE ENGINE: ONLINE</span>
            </div>
          </div>
          <div className="sm:text-right">
            <div className="text-xs font-semibold uppercase tracking-wider text-mdb-text-muted mb-1">
              ACTIVE PLUGINS
            </div>
            <div className="text-2xl font-bold text-mdb-text">{installed.length}</div>
          </div>
        </div>
      </Card>

      {/* Tab Bar */}
      <Tabs items={STORE_TABS} value={activeTab} onChange={setActiveTab} variant="pills" />

      {/* Available Plugins */}
      {activeTab === 'available' && (
        <div className="space-y-6">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search available plugins..."
          />

          {filteredAvailable.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No plugins found"
              description="Check your search query or repository configuration"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAvailable.map((plugin) => {
                const Icon = getIcon(plugin.category);
                const installedPlugin = isInstalled(plugin.id);
                return (
                  <Card key={plugin.id} className="flex flex-col justify-between hover:border-mdb-primary/40 transition-colors">
                    <div className="space-y-4">
                      {/* Icon + Status */}
                      <div className="flex justify-between items-start">
                        <div className="p-3 bg-mdb-surface-high rounded-xl border border-mdb-border">
                          <Icon size={28} className="text-mdb-primary" />
                        </div>
                        {installedPlugin && (
                          <Badge variant="success" dot>
                            INSTALLED
                          </Badge>
                        )}
                      </div>

                      {/* Name + Meta */}
                      <div>
                        <h3 className="text-base font-semibold text-mdb-text">{plugin.name}</h3>
                        <p className="text-xs text-mdb-text-muted mt-0.5">
                          v{plugin.version} • by {plugin.author || 'Unknown'}
                        </p>
                        <p className="text-sm text-mdb-text-secondary mt-2 line-clamp-3 leading-relaxed">
                          {plugin.description}
                        </p>
                        {plugin.tags && (
                          <div className="flex gap-1.5 flex-wrap mt-3">
                            {plugin.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant={tag === 'demo' ? 'info' : tag === 'test' ? 'warning' : 'default'}
                              >
                                {tag.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 pt-4 border-t border-mdb-border flex gap-2">
                      {installedPlugin ? (
                        <Button variant="secondary" size="md" disabled icon={<CheckCircle size={16} />} className="flex-1">
                          Installed
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="md"
                          loading={installing === plugin.id}
                          disabled={installing === plugin.id}
                          icon={<Download size={16} />}
                          onClick={() => handleInstall(plugin.id)}
                          className="flex-1"
                        >
                          Install
                        </Button>
                      )}
                      {plugin.homepage && (
                        <Button
                          as="a"
                          href={plugin.homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="secondary"
                          size="md"
                          icon={<ExternalLink size={16} />}
                        />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Installed Plugins */}
      {activeTab === 'installed' && (
        <div>
          {installed.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No plugins installed"
              description="Browse the Available tab to install plugins"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {installed.map((plugin) => {
                const Icon = getIcon(plugin.category);
                return (
                  <Card key={plugin.id} className="flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="p-3 bg-mdb-surface-high rounded-xl border border-mdb-border">
                          <Icon size={28} className="text-mdb-primary" />
                        </div>
                        <Badge variant={plugin.enabled ? 'success' : 'default'} dot>
                          {plugin.enabled ? 'ENABLED' : 'DISABLED'}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-mdb-text">{plugin.name}</h3>
                        <p className="text-xs text-mdb-text-muted mt-0.5">
                          v{plugin.version} • by {plugin.author || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-mdb-border flex gap-2">
                      <Button variant="secondary" size="md" icon={<Settings size={16} />} className="flex-1">
                        Settings
                      </Button>
                      <ConfirmAction
                        title="Uninstall Plugin"
                        message={`Are you sure you want to uninstall ${plugin.name}?`}
                        confirmLabel="Uninstall"
                        onConfirm={() => handleUninstall(plugin.id)}
                      >
                        <Button
                          variant="danger"
                          size="md"
                          loading={uninstalling === plugin.id}
                          icon={<Trash2 size={16} />}
                          className="flex-1"
                        >
                          Uninstall
                        </Button>
                      </ConfirmAction>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Repositories */}
      {activeTab === 'repos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-mdb-text">Plugin Repositories</h2>
              <p className="text-xs text-mdb-text-muted">Manage external repository sources for plugin installation</p>
            </div>
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={() => {
                setEditingRepo(null);
                setRepoForm({ name: '', url: '' });
                setShowAddRepo(true);
              }}
            >
              Add Repository
            </Button>
          </div>

          <Card padding="none">
            <div className="divide-y divide-mdb-border">
              {repos.map((repo) => (
                <div key={repo.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3 hover:bg-mdb-surface-high/40 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-mdb-text">{repo.name}</span>
                      {!isCustomRepo(repo.id) && (
                        <Badge variant="info">OFFICIAL</Badge>
                      )}
                    </div>
                    <p className="font-mono text-xs text-mdb-text-muted">{repo.url}</p>
                  </div>
                  {isCustomRepo(repo.id) && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Settings size={14} />}
                        onClick={() => handleEditRepo(repo)}
                      >
                        Edit
                      </Button>
                      <ConfirmAction
                        title="Remove Repository"
                        message={`Remove repository "${repo.name}"?`}
                        confirmLabel="Remove"
                        onConfirm={() => handleRemoveRepo(repo.id)}
                      >
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<Trash2 size={14} />}
                        >
                          Delete
                        </Button>
                      </ConfirmAction>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Add/Edit Repository Drawer */}
      <Drawer
        isOpen={showAddRepo}
        onClose={() => {
          setShowAddRepo(false);
          setEditingRepo(null);
        }}
        title={editingRepo ? 'Edit Repository' : 'Add Repository'}
      >
        <form onSubmit={handleAddRepo} className="space-y-4">
          <Input
            label="NAME"
            value={repoForm.name}
            onChange={(e) => setRepoForm({ ...repoForm, name: e.target.value })}
            placeholder="My Custom Repo"
            required
          />
          <Input
            label="URL"
            type="url"
            value={repoForm.url}
            onChange={(e) => setRepoForm({ ...repoForm, url: e.target.value })}
            placeholder="https://plugins.example.com/plugins.json"
            required
          />
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              type="button"
              className="flex-1"
              onClick={() => {
                setShowAddRepo(false);
                setEditingRepo(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="flex-1">
              {editingRepo ? 'Update Repo' : 'Add Repo'}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
