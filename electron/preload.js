const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getGuiVersion: () => ipcRenderer.invoke('gui:getVersion'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  setRepoPath: (path) => ipcRenderer.invoke('config:setRepoPath', path),
  setLocale: (locale) => ipcRenderer.invoke('config:setLocale', locale),
  getParams: () => ipcRenderer.invoke('params:get'),
  saveParams: (params) => ipcRenderer.invoke('params:save', params),
  saveParamsToFile: (params) => ipcRenderer.invoke('params:saveToFile', params),
  loadParamsFromFile: () => ipcRenderer.invoke('params:loadFromFile'),
  selectDirectory: (defaultPath) => ipcRenderer.invoke('dialog:selectDirectory', defaultPath),
  selectFile: (defaultPath) => ipcRenderer.invoke('dialog:selectFile', defaultPath),
  listDir: (directory) => ipcRenderer.invoke('fs:listDir', directory),
  getHomeDir: () => ipcRenderer.invoke('fs:getHomeDir'),
  getFileUrl: (filePath) => ipcRenderer.invoke('fs:getFileUrl', filePath),
  resolveOutDir: (outDir) => ipcRenderer.invoke('viralflow:resolveOutDir', outDir),
  cloneDefaultRepo: () => ipcRenderer.invoke('repo:cloneDefault'),
  gitPullRepo: () => ipcRenderer.invoke('repo:gitPull'),
  getViralflowVersion: () => ipcRenderer.invoke('viralflow:getVersion'),
  viralflowRun: (params) => ipcRenderer.invoke('viralflow:run', params),
  onViralflowLog: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('viralflow:logChunk', listener);
    return () => ipcRenderer.removeListener('viralflow:logChunk', listener);
  },
  checkInstallStatus: () => ipcRenderer.invoke('env:checkInstall'),
  installMicromamba: () => ipcRenderer.invoke('env:installMicromamba'),
  installViralflow: () => ipcRenderer.invoke('env:installViralflow'),
  buildContainers: () => ipcRenderer.invoke('env:buildContainers'),
  updatePangolin: (mode) => ipcRenderer.invoke('env:updatePangolin', mode),
  addSnpeffEntry: (payload) => ipcRenderer.invoke('env:addSnpeffEntry', payload),
  onSetupLog: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('setup:logChunk', listener);
    return () => ipcRenderer.removeListener('setup:logChunk', listener);
  },
});
