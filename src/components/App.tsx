import React, { useState, useEffect } from 'react';
import FavoritesManager from './FavoritesManager'; // Component
import { FavoritesManager as FavoritesManagerUtil, FavoritesStructure } from '../favorites-manager'; // The actual logic
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { KeyRound, Loader2, CheckCircle, XCircle, Settings, Trash2, Eye, EyeOff, RefreshCw, Download, Upload } from 'lucide-react';
import { cn } from '../lib/utils';

const { ipcRenderer } = window.require('electron');

interface AppState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  favoritesStructure: FavoritesStructure | null;
  originalSettings: any;
  currentSessionToken: string | null;
  tokenInput: string;
  rememberToken: boolean;
  loadingStoredToken: boolean;
  showToken: boolean;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isConnected: false,
    isLoading: false,
    error: null,
    favoritesStructure: null,
    originalSettings: null,
    currentSessionToken: null,
    tokenInput: '',
    rememberToken: true,
    loadingStoredToken: true,
    showToken: false,
  });

  // Add dark mode support
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateDarkMode = () => {
      if (prefersDark.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    // Set initial dark mode state
    updateDarkMode();
    prefersDark.addEventListener('change', updateDarkMode);
    
    return () => prefersDark.removeEventListener('change', updateDarkMode);
  }, []);

  // Load stored token on app start
  useEffect(() => {
    const loadStoredToken = async () => {
      try {
        const storedToken = await ipcRenderer.invoke('load-token');
        if (storedToken) {
          setState(prev => ({ 
            ...prev, 
            tokenInput: storedToken, 
            loadingStoredToken: false 
          }));
          // Auto-connect with stored token
          await handleConnectWithToken(storedToken);
        } else {
          setState(prev => ({ ...prev, loadingStoredToken: false }));
        }
      } catch (error) {
        console.error('Failed to load stored token:', error);
        setState(prev => ({ ...prev, loadingStoredToken: false }));
      }
    };
    
    loadStoredToken();
  }, []);

  const handleConnectWithToken = async (token: string) => {
    if (!token.trim()) {
      setState(prev => ({ ...prev, error: 'Token cannot be empty.' }));
      return;
    }

    if (token.length < 50) {
      setState(prev => ({ ...prev, error: 'Invalid token format. Discord tokens are typically 70+ characters long.' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('App: Invoking get-settings IPC.');
      const settings = await ipcRenderer.invoke('get-settings', token.trim());
      console.log('App: get-settings IPC successful. Processing favorites.');
      const favoritesStructure = FavoritesManagerUtil.fromDiscordFavorites(settings);

      // Save token if remember is enabled
      if (state.rememberToken) {
        try {
          await ipcRenderer.invoke('save-token', token.trim());
        } catch (error) {
          console.warn('Failed to save token:', error);
        }
      }

      setState(prev => ({
        ...prev,
        isConnected: true,
        isLoading: false,
        favoritesStructure,
        originalSettings: settings,
        currentSessionToken: token.trim(),
        error: null,
      }));
      console.log('App: Connection successful.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Discord';
      console.error('App: Error during connection:', errorMessage, err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  };

  const handleConnect = async () => {
    await handleConnectWithToken(state.tokenInput.trim());
  };

  const handleSave = async (updatedStructure: FavoritesStructure) => {
    if (!state.originalSettings || !state.currentSessionToken) {
      setState(prev => ({ ...prev, error: 'Cannot save, session not fully initialized.' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const updatedSettings = FavoritesManagerUtil.toDiscordFavorites(
        updatedStructure,
        state.originalSettings
      );
      
      await ipcRenderer.invoke('update-settings', state.currentSessionToken, updatedSettings);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        favoritesStructure: updatedStructure,
        originalSettings: updatedSettings,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
      console.error('App: Error during save:', errorMessage, err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  };

  const handleDisconnect = async () => {
    // Delete stored token if user disconnects
    if (state.rememberToken) {
      try {
        await ipcRenderer.invoke('delete-token');
      } catch (error) {
        console.warn('Failed to delete stored token:', error);
      }
    }

    setState({
      isConnected: false,
      isLoading: false,
      error: null,
      favoritesStructure: null,
      originalSettings: null,
      currentSessionToken: null,
      tokenInput: '',
      rememberToken: true,
      loadingStoredToken: false,
      showToken: false,
    });
  };

  const handleForgetToken = async () => {
    try {
      await ipcRenderer.invoke('delete-token');
      setState(prev => ({ ...prev, rememberToken: false, tokenInput: '' }));
    } catch (error) {
      console.warn('Failed to delete stored token:', error);
    }
  };

  const handleRefreshData = async () => {
    if (!state.currentSessionToken) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const settings = await ipcRenderer.invoke('get-settings', state.currentSessionToken);
      const favoritesStructure = FavoritesManagerUtil.fromDiscordFavorites(settings);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        favoritesStructure,
        originalSettings: settings,
        error: null,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  };

  const handleExportFavorites = () => {
    if (!state.favoritesStructure) return;
    
    const dataStr = JSON.stringify(state.favoritesStructure, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'discord-favorites.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportFavorites = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          setState(prev => ({ ...prev, favoritesStructure: importedData }));
        } catch (error) {
          setState(prev => ({ ...prev, error: 'Failed to import favorites: Invalid file format' }));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (state.loadingStoredToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading saved token...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!state.isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <KeyRound className="h-12 w-12 text-blue-400" />
            </div>
            <CardTitle className="text-2xl text-slate-100">Discord Favorites Manager</CardTitle>
            <CardDescription className="text-slate-300">
              Connect to Discord to manage your favorite channels and organize them with ease.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {state.error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token" className="text-slate-200">Discord Token</Label>
                <div className="relative">
                  <Input
                    id="token"
                    type={state.showToken ? "text" : "password"}
                    placeholder="Enter your Discord token..."
                    value={state.tokenInput}
                    onChange={(e) => setState(prev => ({ ...prev, tokenInput: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !state.isLoading) {
                        handleConnect();
                      }
                    }}
                    className="pr-10 bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-slate-200"
                    onClick={() => setState(prev => ({ ...prev, showToken: !prev.showToken }))}
                  >
                    {state.showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember-token"
                  checked={state.rememberToken}
                  onCheckedChange={(checked) => {
                    setState(prev => ({ ...prev, rememberToken: checked === true }));
                  }}
                  className="border-slate-400 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-slate-900"
                />
                <Label 
                  htmlFor="remember-token" 
                  className="text-sm text-slate-300 cursor-pointer"
                >
                  Remember token (encrypted storage)
                </Label>
              </div>

              <Button 
                onClick={handleConnect}
                disabled={state.isLoading || !state.tokenInput.trim()}
                className={cn(
                  "w-full text-white",
                  state.tokenInput.trim() && !state.isLoading ? "bg-blue-600 hover:bg-blue-700" : ""
                )}
                size="lg"
              >
                {state.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Connect to Discord
                  </>
                )}
              </Button>
            </div>

            <Separator />

            <div className="text-xs text-muted-foreground space-y-2">
              <p className="text-slate-400">
                <strong>How to get your Discord token:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-2 text-slate-400">
                <li>Open Discord in your browser</li>
                <li>Press F12 (Or CTRL+Shift+I) to open Developer Tools</li>
                <li>Go to Network tab and refresh the page</li>
                <li>Look for any request and find the "Authorization" header</li>
                <li>Copy the value after "Authorization:" (without quotes)</li>
              </ol>
              <p className="text-yellow-400">
                ⚠️ Never share your token with anyone!
              </p>
              <p className="text-blue-400 mt-2">
                <a 
                  href="https://github.com/fishylunar/discord-favorites-manager" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  View source code on GitHub - Made with ❤️ by fishylunar // xwxfox
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b bg-white/80 dark:bg-slate-800/80 backdrop-blur shadow-sm flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Discord Favorites Manager</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Organize your favorite channels and sections
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshData}
                disabled={state.isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${state.isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportFavorites}
                disabled={!state.favoritesStructure}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportFavorites}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
              {state.rememberToken && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleForgetToken}
                  className="text-destructive hover:text-destructive flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Forget Token
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          {state.error && (
            <Alert variant="destructive" className="mb-6">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {state.favoritesStructure && (
            <FavoritesManager
              favoritesStructure={state.favoritesStructure}
              onSave={handleSave}
              loading={state.isLoading}
              token={state.currentSessionToken!}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
