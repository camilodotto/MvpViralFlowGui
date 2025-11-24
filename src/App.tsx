import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './App.module.css';

import Home from './pages/Home';
import ParamsPage from './pages/Params';
import RunPage from './pages/Run';
import ResultsPage from './pages/Results';
import SettingsPage from './pages/Settings';
import SetupModal, { InstallInfo } from './pages/SetupModal';

import logo from './assets/viralflow_logo.png';

type TabId = 'home' | 'params' | 'run' | 'results' | 'settings';

const App: React.FC = () => {
  const formatShortViralflowVersion = (full?: string | null) => {
    if (!full) return '';
    const match = full.match(/v[0-9]+(?:\.[0-9]+)*/i);
    return match ? match[0] : full;
  };

  const [tab, setTab] = useState<TabId>('home');
  const [guiVersion, setGuiVersion] = useState<string>('dev');
  const [viralflowVersion, setViralflowVersion] = useState<string | null>(null);
  const [installInfo, setInstallInfo] = useState<InstallInfo | null>(null);
  const [isCheckingInstall, setIsCheckingInstall] = useState<boolean>(true);
  const [modalCanHide, setModalCanHide] = useState<boolean>(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (window.api?.getGuiVersion) {
      window.api.getGuiVersion().then(setGuiVersion);
    }

    if (window.api?.checkInstallStatus) {
      window.api
        .checkInstallStatus()
        .then((info) => {
          setInstallInfo(info);
          setViralflowVersion(info.viralflowVersion ?? null);
          const ready =
            info.micromambaInstalled &&
            info.viralflowInstalled &&
            info.containersBuilt;
          if (ready) {
            setModalCanHide(true);
          }
        })
        .catch(() => {
          setInstallInfo(null);
          setViralflowVersion(null);
        })
        .finally(() => {
          setIsCheckingInstall(false);
        });
    } else if (window.api?.getViralflowVersion) {
      // fallback antigo: apenas obtém versão e não mostra modal
      window.api
        .getViralflowVersion()
        .then(setViralflowVersion)
        .catch(() => setViralflowVersion(null))
        .finally(() => setIsCheckingInstall(false));
    } else {
      setIsCheckingInstall(false);
    }
  }, []);

  const envReady =
    !!installInfo &&
    installInfo.micromambaInstalled &&
    installInfo.viralflowInstalled &&
    installInfo.containersBuilt;

  const showSetupModal =
    !isCheckingInstall && installInfo && (!envReady || !modalCanHide);


  const tabButtonClass = (id: TabId) =>
    id === tab ? `${styles.tabButton} ${styles.tabButtonActive}` : styles.tabButton;

  return (
    <div className={styles.appRoot}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <img src={logo} alt="ViralFlow" className={styles.logo} />
          <div className={styles.titleBlock}>
            <h1 className={styles.appTitle}>{t('app.title')}</h1>
            <p className={styles.appSubtitle}>
              {t('app.subtitle', {
                guiVersion,
                viralflowVersion: viralflowVersion ? formatShortViralflowVersion(viralflowVersion) : t('common.notFound'),
              })}
            </p>
          </div>
        </div>
        <nav className={styles.tabs}>
          <button
            className={tabButtonClass('home')}
            onClick={() => setTab('home')}
          >
            {t('tabs.home')}
          </button>
          <button
            className={tabButtonClass('params')}
            onClick={() => setTab('params')}
          >
            {t('tabs.params')}
          </button>
          <button
            className={tabButtonClass('run')}
            onClick={() => setTab('run')}
          >
            {t('tabs.run')}
          </button>
          <button
            className={tabButtonClass('results')}
            onClick={() => setTab('results')}
          >
            {t('tabs.results')}
          </button>
          <button
            className={tabButtonClass('settings')}
            onClick={() => setTab('settings')}
          >
            {t('tabs.settings')}
          </button>
        </nav>
      </header>

      {showSetupModal && installInfo && (
        <SetupModal
          status={installInfo}
          onStatusChange={(info) => {
            setInstallInfo(info);
            setViralflowVersion(info.viralflowVersion ?? null);
          }}
          onClose={() => setModalCanHide(true)}
        />
      )}

      <main
        className={showSetupModal ? `${styles.main} ${styles.mainDisabled}` : styles.main}
        aria-hidden={!!showSetupModal}
      >
        {tab === 'home' && <Home goToParams={() => setTab('params')} />}
        {tab === 'params' && <ParamsPage goToRun={() => setTab('run')} />}
        {tab === 'run' && <RunPage goToResults={() => setTab('results')} />}
        {tab === 'results' && <ResultsPage />}
        {tab === 'settings' && (
          <SettingsPage
            viralflowVersion={viralflowVersion}
            onViralflowVersionChange={setViralflowVersion}
          />
        )}
      </main>
    </div>
  );
};

export default App;