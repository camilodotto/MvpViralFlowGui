import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Settings.module.css';

type LogEntry = { kind: 'stdout' | 'stderr'; text: string };

interface SettingsPageProps {
  viralflowVersion: string | null;
  onViralflowVersionChange: (v: string | null) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  viralflowVersion,
  onViralflowVersionChange,
}) => {
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [locale, setLocaleState] = useState<string>('en');
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const logsRef = useRef<HTMLPreElement | null>(null);
  const [showPangolinModal, setShowPangolinModal] = useState(false);
  const [showSnpeffModal, setShowSnpeffModal] = useState(false);
  const [snpeffOrgName, setSnpeffOrgName] = useState('');
  const [snpeffGenomeCode, setSnpeffGenomeCode] = useState('');
  const { t, i18n } = useTranslation();

  useEffect(() => {
    window.api
      .getConfig()
      .then(cfg => {
        setRepoPath(cfg.repoPath);
        if (cfg.locale) {
          setLocaleState(cfg.locale);
        }
      })
      .catch(() => setRepoPath(null));
  }, []);

  useEffect(() => {
    const unsubscribe = window.api.onSetupLog((payload) => {
      setLogEntries((prev) => [...prev, payload]);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!logsRef.current) return;
    logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logEntries]);

  const handleCloneDefault = async () => {
    setStatus(t('settings.statusCloning'));
    try {
      const result = await window.api.cloneDefaultRepo();
      setRepoPath(result.path);
      setStatus(
        result.alreadyExists
          ? t('settings.statusCloneExists', { path: result.path })
          : t('settings.statusCloneOk', { path: result.path }),
      );
    } catch (e: any) {
      setStatus(t('settings.statusCloneError', { message: e?.message ?? String(e) }));
    }
  };

  const handleGitPull = async () => {
    setStatus(t('settings.statusGitPull'));
    setLogEntries([]);
    try {
      const result = await window.api.gitPullRepo();
      // logs do git pull agora são enviados para a área de logs via sendSetupLog no processo principal
      setStatus(t('settings.statusGitPullOk', { log: '' }));
      // depois do pull, podemos tentar atualizar a versão detectada
      const v = await window.api.getViralflowVersion();
      onViralflowVersionChange(v);
    } catch (e: any) {
      setStatus(t('settings.statusGitPullError', { message: e?.message ?? String(e) }));
    }
  };

  const handleBuildContainers = async () => {
    setStatus(t('setup.phaseBuildingContainers'));
    setLogEntries([]);
    try {
      const result = await window.api.buildContainers();
      if (!result.ok && result.error) {
        setStatus(result.error);
      } else {
        setStatus('');
      }
    } catch (e: any) {
      setStatus(String(e));
    }
  };


  const openPangolinModal = () => {
    setShowPangolinModal(true);
  };

  const handleUpdatePangolin = async (mode: 'toolAndData' | 'dataOnly') => {
    setShowPangolinModal(false);
    setStatus(t('settings.updatePangolinRunning'));
    setLogEntries([]);
    try {
      const result = await window.api.updatePangolin(mode);
      if (!result.ok && result.error) {
        setStatus(result.error);
      } else {
        setStatus('');
      }
    } catch (e: any) {
      setStatus(String(e));
    }
  };

  const openSnpeffModal = () => {
    setSnpeffOrgName('');
    setSnpeffGenomeCode('');
    setShowSnpeffModal(true);
  };

  const handleConfirmSnpeff = async () => {
    if (!snpeffOrgName || !snpeffGenomeCode) {
      setShowSnpeffModal(false);
      return;
    }
    setShowSnpeffModal(false);
    setStatus(t('settings.snpeffRunning'));
    setLogEntries([]);
    setLogEntries(prev => [
      ...prev,
      { kind: 'stdout', text: '\n=== Atualizando snpEff ===\n' },
    ]);
    try {
      const result = await window.api.addSnpeffEntry({
        orgName: snpeffOrgName,
        genomeCode: snpeffGenomeCode,
      });
      if (!result.ok && result.error) {
        setStatus(result.error);
      } else {
        setStatus('');
      }
    } catch (e: any) {
      setStatus(String(e));
    }
  };

  const handleRefreshVersion = async () => {
    setStatus(t('settings.statusQueryVersion'));
    try {
      const v = await window.api.getViralflowVersion();
      onViralflowVersionChange(v);
      setStatus('');
    } catch (e: any) {
      setStatus(t('settings.statusQueryVersionError', { message: e?.message ?? String(e) }));
    }
  };

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('settings.integrationTitle')}</h3>
        <div className={styles.fieldRow}>
          <span className={styles.label}>{t('settings.repoLabel')}</span>
          <span className={styles.value}>
            {repoPath ?? t('settings.repoNotConfigured')}
          </span>
        </div>

        <div className={styles.buttonRow}>
          <button className={styles.button} onClick={handleGitPull} disabled={!repoPath}>
            {t('settings.gitPullButton')}
          </button>
          <button className={styles.button} onClick={handleBuildContainers}>
            {t('setup.buildContainersButton')}
          </button>
          <button className={styles.button} onClick={openPangolinModal} disabled={!repoPath}>
            {t('settings.updatePangolinButton')}
          </button>
          <button className={styles.button} onClick={openSnpeffModal} disabled={!repoPath}>
            {t('settings.snpeffButton')}
          </button>
        </div>

        <div className={styles.logsContainer}>
          {logEntries.length === 0 ? (
            <pre className={styles.logs}>
              {t('settings.logsPlaceholder')}
            </pre>
          ) : (
            <pre ref={logsRef} className={styles.logs}>
              {logEntries.map((entry, idx) => (
                <span
                  key={idx}
                  className={entry.kind === 'stderr' ? styles.logError : undefined}
                >
                  {entry.text}
                </span>
              ))}
            </pre>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('settings.languageTitle')}</h3>
        <div className={styles.fieldRow}>
          <span className={styles.label}>{t('settings.languageHelp')}</span>
          <select
            className={styles.languageSelect}
            value={locale}
            onChange={async ev => {
              const newLocale = ev.target.value;
              setLocaleState(newLocale);
              await window.api.setLocale(newLocale);
              await i18n.changeLanguage(newLocale);
            }}
          >
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en">English</option>
          </select>
        </div>
      </section>

      {showPangolinModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>{t('settings.updatePangolinButton')}</h3>
            <p className={styles.modalText}>{t('settings.updatePangolinConfirm')}</p>
            <div className={styles.modalActions}>
              <button
                className={styles.button}
                onClick={() => handleUpdatePangolin('toolAndData')}
              >
                Ferramenta + bases
              </button>
              <button
                className={styles.button}
                onClick={() => handleUpdatePangolin('dataOnly')}
              >
                Apenas bases
              </button>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => setShowPangolinModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showSnpeffModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>{t('settings.snpeffButton')}</h3>
            <p className={styles.modalText}>{t('settings.snpeffRunning')}</p>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>
                {t('settings.snpeffOrgNamePrompt')}
                <input
                  className={styles.modalInput}
                  value={snpeffOrgName}
                  onChange={ev => setSnpeffOrgName(ev.target.value)}
                />
              </label>
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>
                {t('settings.snpeffGenomeCodePrompt')}
                <input
                  className={styles.modalInput}
                  value={snpeffGenomeCode}
                  onChange={ev => setSnpeffGenomeCode(ev.target.value)}
                />
              </label>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.button} onClick={handleConfirmSnpeff}>
                OK
              </button>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => setShowSnpeffModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsPage;
