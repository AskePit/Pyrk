const { app, BrowserWindow, globalShortcut } = require('electron')

const createWindow = () => {
    const win = new BrowserWindow({
        fullscreen: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        autoHideMenuBar: true
    });

    win.loadFile('index.html', {query: {"argv": JSON.stringify(process.argv)}})
};

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Register a 'Esc' shortcut listener.
    const ret = globalShortcut.register('Esc', () => {
        app.quit();
    })
    
    if (!ret) {
        console.log('registration error')
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
  
app.on('will-quit', () => {
    // Reject shortcuts registration
    globalShortcut.unregister('Esc')
    globalShortcut.unregisterAll()
})
