import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Run.module.css';
import type { ViralflowParams } from '../types/params';

interface RunPageProps {
  goToResults: () => void;
}

type RunStatus = 'idle' | 'running' | 'success' | 'error';


type LogEntry = { kind: 'stdout' | 'stderr'; text: string };

// Cache global simples para manter logs entre navegações
let lastLogEntries: LogEntry[] = [];



/**
 * Tela de execução: mostra preview do comando e executa o ViralFlow via IPC.
 */
const RunPage: React.FC<RunPageProps> = ({ goToResults }) => {
  const { t } = useTranslation();
  const [params, setParams] = useState<ViralflowParams | null>(null);
  const [status, setStatus] = useState<RunStatus>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [logEntries, setLogEntries] = useState<LogEntry[]>(lastLogEntries);
  const logsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.api
      .getParams()
      .then((p) => {
        if (cancelled) return;
        setParams(p);
      })
      .catch(() => {
        // ignora por enquanto
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const unsubscribe = window.api.onViralflowLog((payload) => {
      setLogEntries((prev) => {
        if (prev.length === 0) {
          const updated: LogEntry[] = [payload];
          lastLogEntries = updated;
          return updated;
        }

        const entries: LogEntry[] = [...prev];
        const last = entries[entries.length - 1];

        // Normaliza CRLF para LF primeiro
        const chunk = payload.text.replace(/\r\n/g, '\n');

        // Se não há carriage return, apenas adiciona como novo bloco
        if (!chunk.includes('\r')) {
          const updated = [...entries, payload];
          lastLogEntries = updated;
          return updated;
        }

        // Há um ou mais \r: interpretamos como reescrita da linha atual.
        const parts = chunk.split('\r');

        // Trabalhamos em cima de uma cópia do último entry
        let current: LogEntry = { ...last };

        parts.forEach((part, index) => {
          if (index === 0) {
            // Primeiro trecho: concatena normalmente
            current.text += part;
          } else {
            // Trechos após um \r reescrevem a linha desde o último \n
            const text = current.text;
            const lastNl = text.lastIndexOf('\n');
            if (lastNl === -1) {
              current.text = part;
            } else {
              current.text = text.slice(0, lastNl + 1) + part;
            }
          }
        });

        entries[entries.length - 1] = current;
        const updated = entries;
        lastLogEntries = updated;
        return updated;
      });
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logEntries]);


  const statusLabel = useMemo(() => {
    switch (status) {
      case 'running':
        return t('run.statusRunning');
      case 'success':
        return t('run.statusSuccess');
      case 'error':
        return t('run.statusError');
      case 'idle':
      default:
        return t('run.statusIdle');
    }
  }, [status, t]);

  const statusClass = useMemo(() => {
    switch (status) {
      case 'running':
        return styles.statusRunning;
      case 'success':
        return styles.statusSuccess;
      case 'error':
        return styles.statusError;
      case 'idle':
      default:
        return '';
    }
  }, [status]);

  const handleRun = async () => {
    if (!params) {
      setStatus('error');
      const initial: LogEntry[] = [{ kind: 'stderr', text: t('run.noParams') }];
      setLogEntries(initial);
      lastLogEntries = initial;
      return;
    }

    setIsRunning(true);
    setStatus('running');
    setLogEntries([]);
    lastLogEntries = [];

    try {
      const result = await window.api.viralflowRun(params);
      setStatus(result.ok ? 'success' : 'error');
    } catch (e: any) {
      setStatus('error');
      const initial: LogEntry[] = [{ kind: 'stderr', text: String(e) }];
      setLogEntries(initial);
      lastLogEntries = initial;
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('run.title')}</h2>
        <p className={styles.sectionDescription}>{t('run.description')}</p>

        <div className={styles.actionsRow}>
          <button
            className={styles.runButton}
            onClick={handleRun}
            disabled={isRunning}
          >
            {isRunning ? t('run.statusRunning') : t('run.runButton')}
          </button>
          <button
            className={styles.secondaryButton}
            style={{ backgroundColor: '#10b981', color: '#ffffff', borderColor: '#10b981' }}
            onClick={goToResults}
          >
            {t('run.goToResults')}
          </button>
        </div>
      </section>

      <section className={`${styles.section} ${styles.logsSection}`}>
        <div className={styles.logsHeader}>
          <span>{t('run.logsStdout')}</span>
          <div className={`${styles.status} ${statusClass}`}>
            {statusLabel}
          </div>
        </div>
        <div className={styles.logsBox} ref={logsRef}>
          {logEntries.length === 0 ? (
            <pre>{t('run.logsPlaceholder')}</pre>
          ) : (
            <pre>
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
    </div>
  );
};

export default RunPage;