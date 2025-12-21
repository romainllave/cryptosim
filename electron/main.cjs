const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const isDev = !app.isPackaged;

// Menu.setApplicationMenu(null); // Moved to whenReady

// Global error handlers to prevent silent crashes
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (app.isReady()) {
        dialog.showErrorBox('Erreur Interne', `Une erreur inattendue est survenue : \n${error.message}`);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

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
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch(err => {
            console.error('Failed to load index.html:', err);
        });

        // Check for updates with delay and error handling
        setTimeout(() => {
            autoUpdater.checkForUpdatesAndNotify().catch(err => {
                console.error('Initial update check failed:', err);
            });
        }, 3000);
    }
}

// Auto-updater diagnostic logs
autoUpdater.on('checking-for-update', () => {
    console.log('Auto-updater: Vérification des mises à jour...');
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('update-status', { status: 'checking', message: 'Vérification des mises à jour...' });
    });
});

autoUpdater.on('update-available', (info) => {
    console.log('Auto-updater: Mise à jour disponible ! Version:', info.version);
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('update-status', { status: 'available', message: 'Mise à jour disponible ! Téléchargement...', version: info.version });
    });
});

autoUpdater.on('update-not-available', (info) => {
    console.log('Auto-updater: Aucune mise à jour disponible. Version actuelle:', info.version);
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('update-status', { status: 'not-available', message: 'Application à jour' });
    });
});

autoUpdater.on('download-progress', (progressObj) => {
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('update-status', {
            status: 'downloading',
            message: 'Téléchargement de la mise à jour...',
            percent: progressObj.percent
        });
    });
});

autoUpdater.on('update-downloaded', (info) => {
    console.log('Auto-updater: Mise à jour téléchargée. Prête à être installée.');
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('update-status', { status: 'ready', message: 'Mise à jour prête. Redémarrage...' });
    });
    // Auto install after a short delay to let UI show the message
    setTimeout(() => {
        autoUpdater.quitAndInstall();
    }, 2000);
});

autoUpdater.on('error', (err) => {
    console.error('Auto-updater Erreur:', err);
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('update-status', { status: 'error', message: 'Erreur lors de la mise à jour' });
    });
});

const { ipcMain } = require('electron');

// Get App Version
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// Manual update trigger via IPC
ipcMain.on('check-for-updates', () => {
    if (isDev) {
        dialog.showMessageBox({
            type: 'info',
            title: 'Mise à jour (Mode Dev)',
            message: 'La vérification des mises à jour est désactivée en mode développement.',
        });
        return;
    }

    autoUpdater.checkForUpdatesAndNotify().then((result) => {
        console.log('Manual check result:', result);
        if (!result || !result.updateInfo || result.updateInfo.version === app.getVersion()) {
            dialog.showMessageBox({
                type: 'info',
                title: 'Mise à jour',
                message: 'Votre application est déjà à jour (Version ' + app.getVersion() + ') !',
            });
        }
    }).catch((err) => {
        console.error('Manual check error:', err);
        dialog.showErrorBox('Erreur mise à jour', 'Impossible de vérifier les mises à jour. \n\nDétail: ' + err.message);
    });
});

app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
