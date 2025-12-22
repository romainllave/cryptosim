const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// --- STABILITY: Disable Hardware Acceleration ---
// This is a known fix for "memory could not be read" errors on many PC configurations.
app.disableHardwareAcceleration();

const isDev = !app.isPackaged;

// --- DIAGNOSTICS: Simple Log System ---
const logPath = path.join(app.getPath('userData'), 'app.log');
function log(message) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    try {
        fs.appendFileSync(logPath, formattedMessage);
    } catch (e) {
        // Ignore logging errors
    }
}

log(`Démarrage de l'application (Version ${app.getVersion()})`);
log(`UserData Path: ${app.getPath('userData')}`);

// Global error handlers to prevent silent crashes
process.on('uncaughtException', (error) => {
    log(`CRITICAL ERROR: ${error.message}\n${error.stack}`);
    if (app.isReady()) {
        dialog.showErrorBox('Erreur Interne', `Une erreur inattendue est survenue : \n${error.message}\n\nConsultez app.log dans ${app.getPath('userData')}`);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    log(`UNHANDLED REJECTION: ${reason}`);
});

function createWindow() {
    log('Création de la fenêtre principale...');
    const mainWindow = new BrowserWindow({
        width: 450,
        height: 450,
        resizable: false,
        frame: false,
        transparent: true,
        center: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
            sandbox: false,
        },
        backgroundColor: '#00000000',
        icon: path.join(__dirname, '../public/icons/icon.png'),
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173').catch(err => log(`URL load error: ${err}`));
    } else {
        const indexPath = path.join(__dirname, '../dist/index.html');
        log(`Loading production file: ${indexPath}`);
        mainWindow.loadFile(indexPath).catch(err => {
            log(`File load error: ${err}`);
            dialog.showErrorBox('Erreur de chargement', `Impossible de charger l'interface : ${err.message}`);
        });

        // immediate update check on prod
        autoUpdater.checkForUpdatesAndNotify().catch(err => log(`Auto-update check failed: ${err}`));
    }
}

// Auto-updater diagnostic logs
autoUpdater.on('checking-for-update', () => {
    log('Auto-updater: Vérification des mises à jour...');
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('update-status', { status: 'checking', message: 'Vérification des mises à jour...' });
    });
});

autoUpdater.on('update-available', (info) => {
    log(`Auto-updater: Mise à jour disponible ! Version: ${info.version}`);
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('update-status', { status: 'available', message: 'Mise à jour disponible ! Téléchargement...', version: info.version });
    });
});

autoUpdater.on('update-not-available', (info) => {
    log(`Auto-updater: Aucune mise à jour disponible. Version: ${info.version}`);
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
    log('Auto-updater: Mise à jour téléchargée.');
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('update-status', { status: 'ready', message: 'Mise à jour prête. Redémarrage...' });
    });
    setTimeout(() => {
        log('Application de la mise à jour (quitAndInstall)...');
        autoUpdater.quitAndInstall();
    }, 2000);
});

autoUpdater.on('error', (err) => {
    log(`Auto-updater Error: ${err}`);
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('update-status', { status: 'error', message: 'Erreur lors de la mise à jour' });
    });
});

// Get App Version
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// Expand Window when loading is finished
ipcMain.on('expand-window', () => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (win) {
        log('Agrandissement de la fenêtre...');
        win.setResizable(true);
        win.setFullScreenable(true);
        // We use a small timeout to let the UI update if needed
        setTimeout(() => {
            win.setSize(1280, 800, true);
            win.center();
            // We keep it transparent but the body will have its own background
        }, 100);
    }
});

// Window Controls
ipcMain.on('window-minimize', () => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (win) win.minimize();
});

ipcMain.on('window-maximize', () => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (win) {
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    }
});

ipcMain.on('window-close', () => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (win) win.close();
});

// Manual update trigger via IPC
ipcMain.on('check-for-updates', () => {
    log('Manual update check requested.');
    if (isDev) {
        dialog.showMessageBox({
            type: 'info',
            title: 'Mise à jour (Mode Dev)',
            message: 'La vérification des mises à jour est désactivée en mode développement.',
        });
        return;
    }

    autoUpdater.checkForUpdatesAndNotify().then((result) => {
        if (!result || !result.updateInfo || result.updateInfo.version === app.getVersion()) {
            dialog.showMessageBox({
                type: 'info',
                title: 'Mise à jour',
                message: 'Votre application est déjà à jour (Version ' + app.getVersion() + ') !',
            });
        }
    }).catch((err) => {
        log(`Manual check error: ${err}`);
        dialog.showErrorBox('Erreur mise à jour', 'Impossible de vérifier les mises à jour. \n\nDétail: ' + err.message);
    });
});

app.whenReady().then(() => {
    log('App ready. Setting menu and creating window.');
    Menu.setApplicationMenu(null);
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    log('Toutes les fenêtres sont fermées.');
    if (process.platform !== 'darwin') app.quit();
});
