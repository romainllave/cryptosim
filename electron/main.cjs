const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const isDev = !app.isPackaged;

Menu.setApplicationMenu(null);

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
        },
        backgroundColor: '#131722',
        icon: path.join(__dirname, '../public/icons/icon.png'),
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        // mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

        // Check for updates only in production
        autoUpdater.checkForUpdatesAndNotify();
    }
}

// Auto-updater diagnostic logs
autoUpdater.on('checking-for-update', () => {
    console.log('Auto-updater: Vérification des mises à jour...');
});

autoUpdater.on('update-available', (info) => {
    console.log('Auto-updater: Mise à jour disponible ! Version:', info.version);
    dialog.showMessageBox({
        type: 'info',
        title: 'Mise à jour disponible',
        message: `Une nouvelle version (${info.version}) est disponible. Elle sera téléchargée en arrière-plan.`,
    });
});

autoUpdater.on('update-not-available', (info) => {
    console.log('Auto-updater: Aucune mise à jour disponible. Version actuelle:', info.version);
});

autoUpdater.on('update-downloaded', (info) => {
    console.log('Auto-updater: Mise à jour téléchargée. Prête à être installée.');
    dialog.showMessageBox({
        type: 'info',
        title: 'Mise à jour prête',
        message: 'La mise à jour a été téléchargée. L\'application va redémarrer pour l\'installer.',
        buttons: ['Redémarrer']
    }).then((result) => {
        if (result.response === 0) {
            autoUpdater.quitAndInstall();
        }
    });
});

const { ipcMain } = require('electron');

// Manual update trigger via IPC
ipcMain.on('check-for-updates', () => {
    autoUpdater.checkForUpdatesAndNotify().then((result) => {
        if (!result || !result.updateInfo) {
            dialog.showMessageBox({
                type: 'info',
                title: 'Mise à jour',
                message: 'Votre application est déjà à jour !',
            });
        }
    }).catch((err) => {
        dialog.showErrorBox('Erreur mise à jour', 'Impossible de vérifier les mises à jour : ' + err.message);
    });
});

// Get version for UI
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

autoUpdater.on('error', (err) => {
    console.error('Auto-updater Erreur:', err);
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
