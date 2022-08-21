const { app, BrowserWindow, globalShortcut } = require('electron')
const path = require('path')

const createWindow = () => {
    const win = new BrowserWindow({
        fullscreen: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js'),
        },
        autoHideMenuBar: true
    });
    //win.setMenu(null)

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
        console.log('ошибка регистрации')
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
  
app.on('will-quit', () => {
    // Отменяем регистрацию сочетания клавиш.
    globalShortcut.unregister('Esc')

    // Отменяем регистрацию всех сочетаний.
    globalShortcut.unregisterAll()
})
