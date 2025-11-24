const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec, spawn } = require('child_process');
const { pathToFileURL } = require('url');

let mainWindow;

// MVP mode: fake installation state and version (no real commands are executed)
const MVP_VERSION = 'mvp-0.26.8';

const fakeState = {
  micromambaInstalled: false,
  viralflowInstalled: false,
  containersBuilt: false,
};


function getMicromambaCommand() {
  const home = os.homedir();
  const fromHomeBin = path.join(home, 'bin', 'micromamba');
  try {
    if (fs.existsSync(fromHomeBin)) {
      return fromHomeBin;
    }
  } catch {
    // ignore
  }
  return 'micromamba';
}

function getMicromambaEnv() {
  const env = Object.assign({}, process.env);
  const root = path.join(os.homedir(), 'micromamba');
  if (!env.MAMBA_ROOT_PREFIX) {
    env.MAMBA_ROOT_PREFIX = root;
  }
  return env;
}

function execPromise(command, options) {
  return new Promise((resolve) => {
    exec(command, options || {}, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

async function detectMicromamba() {
  // MVP: não executa nenhum comando real; usa apenas o estado em memória.
  return {
    installed: fakeState.micromambaInstalled,
    version: fakeState.micromambaInstalled ? 'MVP-fake-micromamba' : null,
  };
}


async function detectViralflow() {
  // MVP: não executa nenhum comando real; usa apenas o estado em memória.
  return {
    installed: fakeState.viralflowInstalled,
    version: fakeState.viralflowInstalled ? 'MVP-fake-viralflow' : null,
  };
}


function sendSetupLog(kind, text) {
  try {
    if (!mainWindow || !mainWindow.webContents) return;
    mainWindow.webContents.send('setup:logChunk', { kind, text });
  } catch (e) {
    console.error('Erro ao enviar log de setup:', e);
  }
}

function runSetupCommand(command, args, options) {
  return new Promise((resolve) => {
    try {
      const fullCmd = [command].concat(args || []).join(' ');
      sendSetupLog('stdout', `\n$ ${fullCmd}\n`);
      const spawnOptions = Object.assign({ shell: false }, options || {});
      const child = spawn(command, args || [], spawnOptions);

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          if (!data) return;
          sendSetupLog('stdout', data.toString());
        });
      }
      if (child.stderr) {
        child.stderr.on('data', (data) => {
          if (!data) return;
          sendSetupLog('stderr', data.toString());
        });
      }

      child.on('error', (error) => {
        sendSetupLog('stderr', `Erro ao executar comando: ${String(error)}\n`);
        resolve(1);
      });

      child.on('close', (code) => {
        sendSetupLog('stdout', `\n[comando finalizado com código ${code}]\n`);
        resolve(code);
      });
    } catch (e) {
      sendSetupLog('stderr', `Erro inesperado ao iniciar comando: ${String(e)}\n`);
      resolve(1);
    }
  });
}



const CONFIG_FILE = 'config.json';
const PARAMS_FILE = 'params.json';

function getParamsPath() {
  return path.join(getConfigDir(), PARAMS_FILE);
}

function getDefaultParams() {
  return {
    virus: 'sars-cov2',
    primersBED: '',
    outDir: 'launchDir/output/',
    inDir: 'launchDir/input/',
    runSnpEff: true,
    writeMappedReads: true,
    minLen: 75,
    depth: 5,
    mapping_quality: 30,
    base_quality: 30,
    minDpIntrahost: 100,
    trimLen: 0,
    refGenomeCode: '',
    referenceGFF: '',
    referenceGenome: '',
    nextflowSimCalls: '',
    fastp_threads: 1,
    bwa_threads: 1,
    dedup: false,
    ndedup: 3,
  };
}

function normalizeParamsForExecution(rawParams) {
  const base = getDefaultParams();
  const p = Object.assign({}, base, rawParams || {});

  // Campos específicos do modo custom só fazem sentido se virus === 'custom'
  if (p.virus !== 'custom') {
    delete p.refGenomeCode;
    delete p.referenceGFF;
    delete p.referenceGenome;
  }

  // ndedup só é considerado quando dedup está habilitado
  if (!p.dedup) {
    delete p.ndedup;
  }

  return p;
}

function loadParams() {
  try {
    const p = getParamsPath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      const parsed = JSON.parse(raw);
      return Object.assign(getDefaultParams(), parsed || {});
    }
  } catch (e) {
    console.error('Erro ao ler params:', e);
  }
  return getDefaultParams();
}

function saveParams(params) {
  try {
    const dir = getConfigDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(getParamsPath(), JSON.stringify(params, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao salvar params:', e);
  }
}


function getDefaultLocale() {
  const raw = app.getLocale() || 'en';
  const lower = raw.toLowerCase();
  if (lower.startsWith('pt')) return 'pt-BR';
  if (lower.startsWith('en')) return 'en';
  return 'en';
}


function getConfigDir() {
  return app.getPath('userData');
}

function getConfigPath() {
  return path.join(getConfigDir(), CONFIG_FILE);
}

function loadConfig() {
  try {
    const p = getConfigPath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed.locale) {
        parsed.locale = getDefaultLocale();
      }
      if (typeof parsed.containersBuilt !== 'boolean') {
        parsed.containersBuilt = false;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Erro ao ler config:', e);
  }
  return { repoPath: null, locale: getDefaultLocale(), containersBuilt: false };
}


function serializeParamsToViralflow(params) {
  const p = normalizeParamsForExecution(params);
  const lines = [];
  lines.push('# ViralFlow params generated by ViralFlow GUI');
  lines.push('# See https://viralflow.github.io/ for argument descriptions');
  const keysInOrder = [
    'virus',
    'primersBED',
    'outDir',
    'inDir',
    'runSnpEff',
    'writeMappedReads',
    'minLen',
    'depth',
    'mapping_quality',
    'base_quality',
    'minDpIntrahost',
    'trimLen',
    'refGenomeCode',
    'referenceGFF',
    'referenceGenome',
    'nextflowSimCalls',
    'fastp_threads',
    'bwa_threads',
    'dedup',
    'ndedup',
  ];
  keysInOrder.forEach((key) => {
    if (!(key in p)) return;
    let value = p[key];
    if (value === null || typeof value === 'undefined' || value === '') {
      value = 'null';
    }
    lines.push(`${key} ${value}`);
  });
  return lines;
}

function parseViralflowParamsFile(text) {
  const result = {};
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const key = parts[0];
    const valueStr = parts.slice(1).join(' ');
    switch (key) {
      case 'virus':
        if (valueStr === 'sars-cov2' || valueStr === 'custom') {
          result.virus = valueStr;
        }
        break;
      case 'primersBED':
      case 'outDir':
      case 'inDir':
      case 'refGenomeCode':
      case 'referenceGFF':
      case 'referenceGenome':
      case 'nextflowSimCalls':
        result[key] = valueStr === 'null' ? '' : valueStr;
        break;
      case 'runSnpEff':
      case 'writeMappedReads':
      case 'dedup':
        result[key] = valueStr === 'true';
        break;
      case 'minLen':
      case 'depth':
      case 'mapping_quality':
      case 'base_quality':
      case 'minDpIntrahost':
      case 'trimLen':
      case 'fastp_threads':
      case 'bwa_threads':
      case 'ndedup': {
        const n = Number(valueStr);
        if (!Number.isNaN(n)) {
          result[key] = n;
        }
        break;
      }
      default:
        break;
    }
  }
  return result;
}


function buildViralflowCommand(params) {
  const p = normalizeParamsForExecution(params);
  const cwd = getViralflowCwd();

  // Arquivo .params fixo, sobrescrito a cada execução
  const paramsPath = path.resolve(cwd, 'viralflow-gui.params');

  try {
    const lines = serializeParamsToViralflow(p);
    fs.writeFileSync(paramsPath, lines.join('\n') + '\n', 'utf-8');
  } catch (e) {
    console.error('Erro ao escrever arquivo de parâmetros para execução:', e);
  }

  const safePath = paramsPath.replace(/"/g, '\\"');
  const cmd = `micromamba run -n viralflow viralflow -run --params "${safePath}"`;
  const args = ['micromamba', 'run', '-n', 'viralflow', 'viralflow', '-run', '--params', paramsPath];

  return { cmd, args, params: p, paramsPath };
}

function getViralflowCwd() {
  const cfg = loadConfig();
  if (cfg && cfg.repoPath) {
    return cfg.repoPath;
  }
  const def = defaultRepoPath();
  if (fs.existsSync(def)) {
    return def;
  }
  return process.cwd();
}




function saveConfig(config) {
  try {
    const dir = getConfigDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao salvar config:', e);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const indexHtml = path.join(__dirname, '..', 'dist', 'index.html');
  mainWindow.loadFile(indexHtml);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers

ipcMain.handle('gui:getVersion', () => {
  // MVP: we expose a fixed GUI version string so the header shows the MVP build name.
  return MVP_VERSION;
});

ipcMain.handle('config:get', () => {
  return loadConfig();
});

ipcMain.handle('config:setRepoPath', (_event, repoPath) => {
  const cfg = loadConfig();
  cfg.repoPath = repoPath || null;
  saveConfig(cfg);
  return cfg;
});

ipcMain.handle('config:setLocale', (_event, locale) => {
  const cfg = loadConfig();
  cfg.locale = locale || getDefaultLocale();
  saveConfig(cfg);
  return cfg;
});

function defaultRepoPath() {
  return path.join(os.homedir(), 'ViralFlow');
}

function isGitRepo(dir) {
  try {
    return fs.existsSync(path.join(dir, '.git'));
  } catch {
    return false;
  }
}

ipcMain.handle('repo:cloneDefault', () => {
  return new Promise((resolve) => {
    const target = defaultRepoPath();

    const cfg = loadConfig();
    cfg.repoPath = target;
    saveConfig(cfg);

    sendSetupLog(
      'stdout',
      `\n=== [MVP] Simulando clone do repositório ViralFlow ===\nRepositório simulado em: ${target}\nNenhum comando git real foi executado.\n`,
    );

    resolve({ ok: true, alreadyExists: false, path: target });
  });
});


ipcMain.handle('repo:gitPull', () => {
  return new Promise((resolve, reject) => {
    const cfg = loadConfig();
    if (!cfg.repoPath) {
      return reject(new Error('RepoPath não configurado.'));
    }

    sendSetupLog(
      'stdout',
      `\n=== [MVP] Simulando git pull (ViralFlow) ===\nRepositório: ${cfg.repoPath}\nNenhum comando git real foi executado.\n`,
    );

    resolve({ ok: true, log: '[MVP] git pull simulado com sucesso.' });
  });
});


ipcMain.handle('dialog:selectDirectory', async (_event, defaultPath) => {
  const basePath = defaultPath || defaultRepoPath() || require('os').homedir();
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    defaultPath: basePath,
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});
ipcMain.handle('dialog:selectFile', async (_event, defaultPath) => {
  const os = require('os');
  const path = require('path');
  let basePath = defaultPath || os.homedir();
  try {
    if (defaultPath && !defaultPath.endsWith(path.sep)) {
      basePath = path.dirname(defaultPath);
    }
  } catch {
    // ignore
  }
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    defaultPath: basePath,
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('params:get', () => {
  return loadParams();
});

ipcMain.handle('params:save', (_event, params) => {
  saveParams(params || {});
  return params;
});

ipcMain.handle('params:saveToFile', async (_event, params) => {
  try {
    const defaultPath = path.join(os.homedir(), 'viralflow.params');
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Salvar arquivo de parâmetros',
      defaultPath,
      filters: [{ name: 'ViralFlow params', extensions: ['params'] }],
    });
    if (canceled || !filePath) {
      return { ok: false, canceled: true };
    }
    const lines = serializeParamsToViralflow(params || {});
    fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
    return { ok: true, path: filePath };
  } catch (e) {
    console.error('Erro ao salvar params em arquivo:', e);
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle('params:loadFromFile', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Carregar arquivo de parâmetros',
      filters: [{ name: 'ViralFlow params', extensions: ['params'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths || filePaths.length === 0) {
      return { ok: false, canceled: true };
    }
    const filePath = filePaths[0];
    const text = fs.readFileSync(filePath, 'utf-8');
    const loaded = parseViralflowParamsFile(text);
    const merged = Object.assign(getDefaultParams(), loaded || {});
    saveParams(merged);
    return { ok: true, path: filePath, params: merged };
  } catch (e) {
    console.error('Erro ao carregar params de arquivo:', e);
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle('viralflow:getVersion', async () => {
  const info = await detectViralflow();
  return info.version || null;
});


ipcMain.handle('env:checkInstall', async () => {
  const cfg = loadConfig();
  // MVP: sempre inicia como se micromamba e ViralFlow NÃO estivessem instalados
  // (fakeState começa com tudo em false). O usuário pode simular a instalação
  // durante a sessão, mas a cada novo start o estado é reiniciado.
  return {
    micromambaInstalled: fakeState.micromambaInstalled,
    micromambaVersion: fakeState.micromambaInstalled ? 'MVP-fake-micromamba' : null,
    viralflowInstalled: fakeState.viralflowInstalled,
    viralflowVersion: fakeState.viralflowInstalled ? 'MVP-fake-viralflow' : null,
    containersBuilt: !!(cfg && cfg.containersBuilt && fakeState.containersBuilt),
  };
});


ipcMain.handle('env:installMicromamba', async () => {
  sendSetupLog('stdout', '\n=== [MVP] Simulando instalação do micromamba ===\n');
  // Simula instalação bem-sucedida
  fakeState.micromambaInstalled = true;
  const version = 'MVP-fake-micromamba';
  sendSetupLog('stdout', `\nMicromamba (fake) instalado. Versão simulada: ${version}\n`);

  return {
    ok: true,
    micromambaInstalled: true,
    micromambaVersion: version,
    viralflowInstalled: fakeState.viralflowInstalled,
    viralflowVersion: fakeState.viralflowInstalled ? 'MVP-fake-viralflow' : null,
    containersBuilt: fakeState.containersBuilt,
  };
});


ipcMain.handle('env:installViralflow', async () => {
  sendSetupLog('stdout', '\n=== [MVP] Simulando instalação do ViralFlow ===\n');

  if (!fakeState.micromambaInstalled) {
    const msg = 'Micromamba (fake) ainda não foi instalado. Simule a instalação do micromamba antes de instalar o ViralFlow.';
    sendSetupLog('stderr', `\n${msg}\n`);
    return {
      ok: false,
      micromambaInstalled: false,
      micromambaVersion: null,
      viralflowInstalled: false,
      viralflowVersion: null,
      containersBuilt: false,
      error: msg,
    };
  }

  // Simula instalação bem-sucedida
  fakeState.viralflowInstalled = true;
  const version = 'MVP-fake-viralflow';
  sendSetupLog('stdout', `\nViralFlow (fake) instalado. Versão simulada: ${version}\n`);

  // Ao simular a reinstalação, containers precisam ser reconstruídos
  fakeState.containersBuilt = false;
  const cfg = loadConfig();
  if (cfg) {
    cfg.containersBuilt = false;
    saveConfig(cfg);
  }

  return {
    ok: true,
    micromambaInstalled: true,
    micromambaVersion: 'MVP-fake-micromamba',
    viralflowInstalled: true,
    viralflowVersion: version,
    containersBuilt: false,
  };
});


ipcMain.handle('env:buildContainers', async () => {
  sendSetupLog('stdout', '\n=== [MVP] Simulando construção dos containers do ViralFlow ===\n');

  if (!fakeState.micromambaInstalled || !fakeState.viralflowInstalled) {
    const msg =
      'Micromamba e/ou ViralFlow (fake) não foram instalados. Simule a instalação antes de construir os containers.';
    sendSetupLog('stderr', `\n${msg}\n`);
    return {
      ok: false,
      containersBuilt: false,
      error: msg,
    };
  }

  // Simula construção de containers
  fakeState.containersBuilt = true;
  const cfg = loadConfig();
  if (cfg) {
    cfg.containersBuilt = true;
    saveConfig(cfg);
  }

  sendSetupLog('stdout', '\nContainers (fake) construídos com sucesso. Nenhum comando real foi executado.\n');
  return { ok: true, containersBuilt: true };
});


ipcMain.handle('env:updatePangolin', async (_event, mode) => {
  sendSetupLog('stdout', '\n=== [MVP] Simulando atualização do Pangolin ===\n');

  if (!fakeState.micromambaInstalled || !fakeState.viralflowInstalled) {
    const msg =
      'Micromamba e/ou ViralFlow (fake) não foram instalados. Simule a instalação antes de atualizar o Pangolin.';
    sendSetupLog('stderr', `\n${msg}\n`);
    return {
      ok: false,
      error: msg,
    };
  }

  const modeDesc = mode === 'dataOnly'
    ? 'apenas bases de dados'
    : 'ferramenta e bases de dados';

  sendSetupLog(
    'stdout',
    `\n[MVP] Atualização do Pangolin (${modeDesc}) simulada com sucesso. Nenhum comando real foi executado.\n`,
  );

  return { ok: true };
});



ipcMain.handle('env:addSnpeffEntry', async (_event, payload) => {
  const { orgName, genomeCode } = payload || {};

  if (!orgName || !genomeCode) {
    const msg = 'Parâmetros org_name e genome_code são obrigatórios.';
    sendSetupLog('stderr', `\n${msg}\n`);
    return { ok: false, error: msg };
  }

  sendSetupLog('stdout', '\n=== [MVP] Simulando adição de entrada ao snpEff ===\n');

  if (!fakeState.micromambaInstalled || !fakeState.viralflowInstalled) {
    const msg =
      'Micromamba e/ou ViralFlow (fake) não foram instalados. Simule a instalação antes de customizar o snpEff.';
    sendSetupLog('stderr', `\n${msg}\n`);
    return {
      ok: false,
      error: msg,
    };
  }

  // Simula operação bem sucedida
  sendSetupLog(
    'stdout',
    `\nEntrada (fake) adicionada ao snpEff para org_name="${orgName}", genome_code="${genomeCode}". Nenhum comando real foi executado.\n`,
  );
  return { ok: true };
});





ipcMain.handle('viralflow:run', (_event, params) => {
  const { cmd } = buildViralflowCommand(params || {});
  const fakeStdout =
    'MVP: execução simulada do ViralFlow. O arquivo de parâmetros foi gerado, ' +
    'mas nenhum comando real foi executado.\n';

  return new Promise((resolve) => {
    if (mainWindow) {
      // Simula o comando que seria executado
      mainWindow.webContents.send('viralflow:logChunk', {
        kind: 'stdout',
        text: `\n$ ${cmd}\n`,
      });
      // Simula a saída padrão do processo
      mainWindow.webContents.send('viralflow:logChunk', {
        kind: 'stdout',
        text: fakeStdout,
      });
    }

    resolve({
      ok: true,
      cmd,
      stdout: fakeStdout,
      stderr: '',
    });
  });
});



ipcMain.handle('fs:listDir', async (_event, dirPath) => {
  if (!dirPath) {
    return [];
  }
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const mapped = entries.map((e) => ({
      name: e.name,
      path: path.join(dirPath, e.name),
      isDirectory: e.isDirectory(),
    }));

    // Ordena: diretórios primeiro, depois arquivos, ambos em ordem alfabética
    mapped.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

    return mapped;
  } catch (e) {
    console.error('Erro ao listar diretório:', dirPath, e);
    throw e;
  }
});



ipcMain.handle('fs:getHomeDir', async () => {
  try {
    return os.homedir();
  } catch (e) {
    console.error('Erro ao obter diretório home do usuário:', e);
    return process.env.HOME || null;
  }
});

ipcMain.handle('fs:getFileUrl', async (_event, filePath) => {
  if (!filePath) return null;
  try {
    const url = pathToFileURL(filePath);
    return url.toString();
  } catch (e) {
    console.error('Erro ao gerar file URL para', filePath, e);
    return null;
  }
});ipcMain.handle('viralflow:resolveOutDir', async (_event, outDir) => {
  if (!outDir) return null;
  try {
    const base = getViralflowCwd();
    if (path.isAbsolute(outDir)) {
      return outDir;
    }
    return path.join(base, outDir);
  } catch (e) {
    console.error('Erro ao resolver outDir', outDir, e);
    return outDir;
  }
});



