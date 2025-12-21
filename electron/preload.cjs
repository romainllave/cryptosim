const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getVersion: () => ipcRenderer.invoke('get-app-version'),
    checkUpdates: () => ipcRenderer.send('check-for-updates'),
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, value) => callback(value)),
});
