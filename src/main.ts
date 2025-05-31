import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { getSettings, updateSettings } from './favorites-manager';

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    title: 'Discord Favorites Manager'
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for Discord API communication
ipcMain.handle('get-settings', async (event, token: string) => {
  try {
    return await getSettings(token);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('update-settings', async (event, token: string, settings: any) => {
  try {
    await updateSettings(token, settings);
    return { success: true };
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('get-channel-info', async (event, token: string, channelId: string) => {
  try {
    const { getChannelInfo } = await import('./favorites-manager');
    return await getChannelInfo(token, channelId);
  } catch (error) {
    throw error;
  }
});

// IPC handlers for token storage
ipcMain.handle('save-token', async (event, token: string) => {
  try {
    const { saveToken } = await import('./token-storage');
    saveToken(token);
    return { success: true };
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('load-token', async () => {
  try {
    const { loadToken } = await import('./token-storage');
    return loadToken();
  } catch (error) {
    console.error('Failed to load token:', error);
    return null;
  }
});

ipcMain.handle('delete-token', async () => {
  try {
    const { deleteToken } = await import('./token-storage');
    deleteToken();
    return { success: true };
  } catch (error) {
    throw error;
  }
});
