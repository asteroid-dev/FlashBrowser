const {
    app,
    protocol,
    BrowserWindow,
	globalShortcut,
    Menu
} = require('electron');
const {autoUpdater} = require("electron-updater");

const path = require('path');
const Store = require('./store.js');

let mainWindow;

let pluginName;
switch (process.platform) {
	case 'win32':
		if (process.arch === "x32" || process.arch === "ia32") {
			pluginName = '32bit.dll';
		} else {
			pluginName = '64bit.dll';
		}
		break;
}
app.commandLine.appendSwitch("disable-renderer-backgrounding");
if (process.platform !== "darwin") {
	app.commandLine.appendSwitch('high-dpi-support', "1");
	app.commandLine.appendSwitch('force-device-scale-factor', "1");
}
app.commandLine.appendSwitch("--enable-npapi");
app.commandLine.appendSwitch('ppapi-flash-path', path.join(__dirname.includes(".asar") ? process.resourcesPath : __dirname, "plugins/" + pluginName));
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');

let sendWindow = (identifier, message) => {
    mainWindow.webContents.send(identifier, message);
};
	
const store = new Store({
  configName: 'user-preferences',
  defaults: {
    windowBounds: { width: 1280, height: 720 }
  }
});

const template = [];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

app.on('ready', () => {

    let { width, height } = store.get('windowBounds');
    
    mainWindow = new BrowserWindow({
        width: width,
        height: height,
		frame: false,
		backgroundColor: '#202124',
        webPreferences: {
            nodeIntegration: true,
            webviewTag: true, 
            plugins: true
        }
    });
    
    const ses = mainWindow.webContents.session;

    mainWindow.loadURL(`file://${__dirname}/browser.html`);
	
	mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['X-APP'] = app.getVersion();
        callback({ requestHeaders: details.requestHeaders })
    });

    sendWindow("version", app.getVersion());
    
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    
    mainWindow.on('resize', () => {
        let { width, height } = mainWindow.getBounds();
        store.set('windowBounds', { width, height });
    });
	
	globalShortcut.register("CTRL+SHIFT+F10", () => {
		let session = mainWindow.webContents.session;
        session.clearCache();
        app.relaunch();
        app.exit();
	});

	autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

autoUpdater.on('checking-for-update', () => {
    sendWindow('checking-for-update', '');
});

autoUpdater.on('update-available', () => {
    sendWindow('update-available', '');
});

autoUpdater.on('update-not-available', () => {
    sendWindow('update-not-available', '');
});

autoUpdater.on('error', (err) => {
    sendWindow('error', 'Error: ' + err);
});

autoUpdater.on('download-progress', (d) => {
    sendWindow('download-progress', {
        speed: d.bytesPerSecond,
        percent: d.percent,
        transferred: d.transferred,
        total: d.total
    });
});

autoUpdater.on('update-downloaded', () => {
    sendWindow('update-downloaded', 'Update downloaded');
    autoUpdater.quitAndInstall();
});
