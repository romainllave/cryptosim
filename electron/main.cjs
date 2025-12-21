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

// Auto-updater events
autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
        type: 'info',
        title: 'Mise à jour disponible',
        message: 'Une nouvelle version est disponible. Elle sera téléchargée en arrière-plan.',
    });
});

autoUpdater.on('update-downloaded', () => {
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

autoUpdater.on('error', (err) => {
    // Silent error in production to not annoy user, or log it
    console.error('Auto-updater error:', err);
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
