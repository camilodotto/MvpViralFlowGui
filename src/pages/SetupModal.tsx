import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './SetupModal.module.css';

type LogEntry = { kind: 'stdout' | 'stderr'; text: string };

export interface InstallInfo {
  micromambaInstalled: boolean;
  micromambaVersion: string | null;
  viralflowInstalled: boolean;
  viralflowVersion: string | null;
  containersBuilt: boolean;
}

interface SetupModalProps {
  status: InstallInfo | null;
  onStatusChange: (info: InstallInfo) => void;
  onClose: () => void;
}

type Phase = 'idle' | 'installingMicromamba' | 'installingViralflow' | 'buildingContainers';

const SetupModal: React.FC<SetupModalProps> = ({ status, onStatusChange, onClose }) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const logsRef = useRef<HTMLPreElement | null>(null);

  const needsMicromamba = !status?.micromambaInstalled;
  const needsViralflow = !status?.viralflowInstalled;
  const needsContainers = !status?.containersBuilt;
  const allReady = !!status && !needsMicromamba && !needsViralflow && !needsContainers;

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

  const isBusy = phase !== 'idle';

  const handleInstallMicromamba = async () => {
    setPhase('installingMicromamba');
    setLogEntries([]);
    try {
      const result = await window.api.installMicromamba();
      const info: InstallInfo = {
        micromambaInstalled: result.micromambaInstalled,
        micromambaVersion: result.micromambaVersion,
        viralflowInstalled: status?.viralflowInstalled ?? false,
        viralflowVersion: status?.viralflowVersion ?? null,
        containersBuilt: status?.containersBuilt ?? false,
      };
      onStatusChange(info);
    } catch (e) {
      // erros já aparecem no log
    } finally {
      setPhase('idle');
    }
  };

  const handleInstallViralflow = async () => {
    setPhase('installingViralflow');
    setLogEntries([]);
    try {
      const result = await window.api.installViralflow();
      const info: InstallInfo = {
        micromambaInstalled: result.micromambaInstalled,
        micromambaVersion: result.micromambaVersion,
        viralflowInstalled: result.viralflowInstalled,
        viralflowVersion: result.viralflowVersion,
        containersBuilt: result.containersBuilt,
      };
      onStatusChange(info);
    } catch (e) {
      // erros já aparecem no log
    } finally {
      setPhase('idle');
    }
  };

  const handleBuildContainers = async () => {
    setPhase('buildingContainers');
    try {
      const result = await window.api.buildContainers();
      const info: InstallInfo = {
        micromambaInstalled: status?.micromambaInstalled ?? false,
        micromambaVersion: status?.micromambaVersion ?? null,
        viralflowInstalled: status?.viralflowInstalled ?? false,
        viralflowVersion: status?.viralflowVersion ?? null,
        containersBuilt: result.containersBuilt ?? false,
      };
      onStatusChange(info);
    } catch (e) {
      // erros já aparecem no log
    } finally {
      setPhase('idle');
    }
  };

  const phaseLabel = useMemo(() => {
    if (phase === 'installingMicromamba') return t('setup.phaseInstallingMicromamba');
    if (phase === 'installingViralflow') return t('setup.phaseInstallingViralflow');
    if (phase === 'buildingContainers') return t('setup.phaseBuildingContainers');
    return '';
  }, [phase, t]);

  const canClose = allReady && !isBusy;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>{t('setup.title')}</h2>
            <p className={styles.description}>{t('setup.description')}</p>
          </div>
          <div className={styles.headerRight}>
            {phaseLabel && <div className={styles.phase}>{phaseLabel}</div>}
            {canClose && (
              <button
                className={styles.closeButton}
                onClick={onClose}
                disabled={isBusy}
              >
                {t('setup.closeButton')}
              </button>
            )}
          </div>
        </header>

        <div className={styles.content}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('setup.micromambaTitle')}</h3>
            <p className={styles.sectionText}>
              {status?.micromambaInstalled
                ? t('setup.micromambaInstalled', {
                    version: status.micromambaVersion || t('common.notFound'),
                  })
                : t('setup.micromambaNotInstalled')}
            </p>
            {needsMicromamba && (
              <button
                className={styles.primaryButton}
                onClick={handleInstallMicromamba}
                disabled={isBusy}
              >
                {t('setup.installMicromambaButton')}
              </button>
            )}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('setup.viralflowTitle')}</h3>
            <p className={styles.sectionText}>
              {status?.viralflowInstalled
                ? t('setup.viralflowInstalled', {
                    version: status.viralflowVersion || t('common.notFound'),
                  })
                : t('setup.viralflowNotInstalled')}
            </p>
            <div className={styles.buttonsRow}>
              {!needsMicromamba && needsViralflow && (
                <button
                  className={styles.primaryButton}
                  onClick={handleInstallViralflow}
                  disabled={isBusy || needsMicromamba}
                >
                  {t('setup.installViralflowButton')}
                </button>
              )}
              {!needsMicromamba && !needsViralflow && needsContainers && (
                <button
                  className={styles.primaryButton}
                  onClick={handleBuildContainers}
                  disabled={isBusy || needsMicromamba || needsViralflow}
                >
                  {t('setup.buildContainersButton')}
                </button>
              )}
            </div>
          </section>
        </div>

        <section className={styles.logsSection}>
          <div className={styles.logsHeader}>
            <h3 className={styles.logsTitle}>{t('setup.logsTitle')}</h3>
          </div>
          <div className={styles.logsContainer}>
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
          </div>
        </section>
      </div>
    </div>
  );
};

export default SetupModal;
