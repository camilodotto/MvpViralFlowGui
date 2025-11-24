import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Results.module.css';

type FileEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
};

type ResultsCache = {
  currentDir: string | null;
  selectedFile: string | null;
  viewerExpanded: boolean;
};

let lastResultsCache: ResultsCache = {
  currentDir: null,
  selectedFile: null,
  viewerExpanded: false,
};

const ResultsPage: React.FC = () => {
  const { t } = useTranslation();

  const [currentDir, setCurrentDir] = useState<string | null>(lastResultsCache.currentDir);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(lastResultsCache.selectedFile);
  const [selectedFileVersion, setSelectedFileVersion] = useState(0);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerExpanded, setViewerExpanded] = useState(lastResultsCache.viewerExpanded);

  useEffect(() => {
    let cancelled = false;

    // Se já temos cache, apenas recarrega o diretório em cache preservando seleção
    if (lastResultsCache.currentDir) {
      setCurrentDir(lastResultsCache.currentDir);
      void loadDirectory(lastResultsCache.currentDir, { preserveSelection: true });
      return () => {
        cancelled = true;
      };
    }

    window.api
      .getParams()
      .then(async (params) => {
        if (cancelled) return;
        if (params && params.outDir) {
          try {
            const resolved = await window.api.resolveOutDir(params.outDir);
            const dir = resolved || params.outDir;

            try {
              // testa se o diretório existe tentando listá-lo
              await window.api.listDir(dir);
              setCurrentDir(dir);
              lastResultsCache.currentDir = dir;
              void loadDirectory(dir);
            } catch {
              // se não existir, cai para a home do usuário
              const home = await window.api.getHomeDir();
              if (home && !cancelled) {
                setCurrentDir(home);
                lastResultsCache.currentDir = home;
                void loadDirectory(home);
              }
            }
          } catch {
            // se não conseguir resolver o outDir, também cai para a home
            const home = await window.api.getHomeDir();
            if (home && !cancelled) {
              setCurrentDir(home);
              lastResultsCache.currentDir = home;
              void loadDirectory(home);
            }
          }
        } else {
          // se não há outDir, usa a home do usuário como padrão
          const home = await window.api.getHomeDir();
          if (home && !cancelled) {
            setCurrentDir(home);
            lastResultsCache.currentDir = home;
            void loadDirectory(home);
          }
        }
      })
      .catch(async () => {
        // se falhar ao obter params, tenta usar a home do usuário
        const home = await window.api.getHomeDir();
        if (home && !cancelled) {
          setCurrentDir(home);
          lastResultsCache.currentDir = home;
          void loadDirectory(home);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDirectory = async (dir: string, options?: { preserveSelection?: boolean }) => {
    setLoading(true);
    setError(null);
    setSelectedFile(null);
    setViewerUrl(null);
    lastResultsCache.currentDir = dir;
    lastResultsCache.selectedFile = null;
    try {
      const children = await window.api.listDir(dir);
      setEntries(children);
    } catch (e: any) {
      setEntries([]);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDirectory = async () => {
    const chosen = await window.api.selectDirectory(currentDir || undefined);
    if (chosen) {
      setCurrentDir(chosen);
      void loadDirectory(chosen);
    }
  };

  const handleGoUp = () => {
    if (!currentDir) return;

    const normalized = currentDir.replace(/\/+$/, '');
    const lastSlash = normalized.lastIndexOf('/');

    if (lastSlash <= 0) {
      return;
    }

    const parent = normalized.slice(0, lastSlash);
    setCurrentDir(parent);
    void loadDirectory(parent);
  };

  const handleEntryClick = (entry: FileEntry) => {
    if (entry.isDirectory) {
      setCurrentDir(entry.path);
      void loadDirectory(entry.path);
    } else {
      setSelectedFile(entry.path);
      setSelectedFileVersion((v) => v + 1);
      lastResultsCache.selectedFile = entry.path;
    }
  };

  useEffect(() => {
    let cancelled = false;

    if (!selectedFile) {
      setViewerUrl(null);
      return;
    }

    (async () => {
      try {
        const url = await window.api.getFileUrl(selectedFile);
        if (!cancelled) {
          setViewerUrl(url);
        }
      } catch {
        if (!cancelled) {
          setViewerUrl(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedFile, selectedFileVersion]);

  const fileType = useMemo(() => {
    if (!selectedFile) return null;
    const lower = selectedFile.toLowerCase();
    const dotIdx = lower.lastIndexOf('.');
    const ext = dotIdx >= 0 ? lower.slice(dotIdx + 1) : '';

    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
      return 'image';
    }
    if (['html', 'htm'].includes(ext)) {
      return 'html';
    }
    if (ext === 'pdf') {
      return 'pdf';
    }
    return 'other';
  }, [selectedFile]);

  const canPreview = viewerUrl && (fileType === 'image' || fileType === 'html' || fileType === 'pdf');

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('results.title')}</h3>
        <p className={styles.sectionDescription}>{t('results.description')}</p>

        <div className={styles.controlsRow}>
          <div className={styles.dirInfo}>
            <span className={styles.dirLabel}>{t('results.outputDirLabel')}</span>
            <input
              className={styles.dirInput}
              type="text"
              value={currentDir || ''}
              readOnly
              placeholder={t('results.noDir')}
            />
          </div>
          <button
            type="button"
            className={styles.dirButton}
            onClick={handleSelectDirectory}
            title={t('results.changeDirTooltip')}
          >
            ...
          </button>
        </div>

        <div
          className={
            viewerExpanded
              ? `${styles.resultsLayout} ${styles.resultsLayoutExpanded}`
              : styles.resultsLayout
          }
        >
          <div
            className={
              viewerExpanded
                ? `${styles.browserPane} ${styles.browserPaneHidden}`
                : styles.browserPane
            }
          >
            <div className={styles.browserHeader}>
              <span className={styles.browserTitle}>{t('results.fileListTitle')}</span>
              <button
                type="button"
                className={styles.upButton}
                onClick={handleGoUp}
                disabled={!currentDir}
                title={t('results.goUpTooltip')}
              >
                ↑ ..
              </button>
            </div>
            <div className={styles.browserBody}>
              {loading && <div className={styles.browserMessage}>{t('results.loading')}</div>}
              {!loading && error && (
                <div className={styles.browserMessageError}>{error}</div>
              )}
              {!loading && !error && !currentDir && (
                <div className={styles.browserMessage}>{t('results.noDir')}</div>
              )}
              {!loading && !error && currentDir && entries.length === 0 && (
                <div className={styles.browserMessage}>{t('results.emptyDir')}</div>
              )}
              {!loading && !error && currentDir && entries.length > 0 && (
                <ul className={styles.fileList}>
                  {entries.map((entry) => (
                    <li
                      key={entry.path}
                      className={[
                        styles.fileItem,
                        entry.isDirectory ? styles.fileItemDirectory : '',
                        selectedFile === entry.path ? styles.fileItemSelected : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => handleEntryClick(entry)}
                    >
                      <span className={styles.fileItemName}>
                        {entry.isDirectory ? '📁' : '📄'} {entry.name}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className={styles.viewerPane}>
            <div className={styles.viewerHeader}>
              <div className={styles.viewerHeaderLeft}>
                <span className={styles.viewerTitle}>{t('results.previewTitle')}</span>
                {selectedFile && (
                  <span className={styles.viewerSubtitle}>{selectedFile}</span>
                )}
              </div>
              <div className={styles.viewerHeaderRight}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setViewerExpanded((v) => {
                      const next = !v;
                      lastResultsCache.viewerExpanded = next;
                      return next;
                    });
                  }}
                >
                  {viewerExpanded
                    ? t('results.collapseViewer')
                    : t('results.expandViewer')}
                </button>
              </div>
            </div>

            <div className={styles.viewerBody}>
              {!selectedFile && (
                <div className={styles.viewerPlaceholder}>
                  {t('results.noFileSelected')}
                </div>
              )}

              {selectedFile && !canPreview && (
                <div className={styles.viewerPlaceholder}>
                  {t('results.unsupportedPreview')}
                </div>
              )}

              {selectedFile && canPreview && viewerUrl && fileType === 'image' && (
                <div className={styles.viewerContentWrapper}>
                  <img src={viewerUrl} className={styles.viewerContent} alt="" />
                </div>
              )}

              {selectedFile && canPreview && viewerUrl && (fileType === 'html' || fileType === 'pdf') && (
                <div className={styles.viewerContentWrapper}>
                  <iframe
                    key={`${selectedFile}-${selectedFileVersion}`}
                    src={viewerUrl}
                    className={styles.viewerContent}
                    title="preview"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ResultsPage;