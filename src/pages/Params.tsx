import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ViralflowParams } from '../types/params';
import { loadParams, saveParams } from '../services/paramsStore';
import styles from './Params.module.css';

interface ParamsPageProps {
  goToRun: () => void;
}

/**
 * Página de parâmetros: carrega os defaults da documentação do ViralFlow,
 * permite edição e persiste automaticamente entre execuções (userData/params.json).
 * A execução sempre usará os parâmetros em memória (não depende de arquivo .params).
 */
const ParamsPage: React.FC<ParamsPageProps> = ({ goToRun }) => {
  const { t } = useTranslation();
  const [params, setParams] = useState<ViralflowParams | null>(null);

  useEffect(() => {
    loadParams()
      .then(setParams)
      .catch(() => {
        setParams({
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
        });
      });
  }, []);

  const updateField = <K extends keyof ViralflowParams>(key: K, value: ViralflowParams[K]) => {
    setParams(prev => {
      if (!prev) return prev;
      const updated: ViralflowParams = { ...prev, [key]: value };
      saveParams(updated).catch(() => {
        // ignorar erro no MVP
      });
      return updated;
    });
  };

  const handleSaveParamsFile = async () => {
    if (!params) return;
    try {
      const res = await window.api.saveParamsToFile(params);
      if (!res || !res.ok) {
        if (res && res.canceled) {
          return;
        }
        alert(t('params.messages.saveParamsError'));
      }
    } catch (e) {
      alert(t('params.messages.saveParamsError'));
    }
  };

  const handleLoadParamsFile = async () => {
    try {
      const res = await window.api.loadParamsFromFile();
      if (!res || !res.ok) {
        if (res && res.canceled) {
          return;
        }
        alert(t('params.messages.loadParamsError'));
        return;
      }
      if (res.params) {
        setParams(res.params);
      } else {
        alert(t('params.messages.loadParamsInvalid'));
      }
    } catch (e) {
      alert(t('params.messages.loadParamsError'));
    }
  };

  if (!params) {
    return <div>{t('params.loading')}</div>;
  }

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('params.sections.actions')}</h3>
        <div className={styles.actionsRow}>
          <button className={styles.secondaryButton} onClick={handleSaveParamsFile}>
            {t('params.buttons.saveParams')}
          </button>
          <button className={styles.secondaryButton} onClick={handleLoadParamsFile}>
            {t('params.buttons.loadParams')}
          </button>
          <button
            className={styles.secondaryButton}
            style={{ backgroundColor: '#10b981', color: '#ffffff', borderColor: '#10b981' }}
            onClick={goToRun}
          >
            {t('params.buttons.goToRun')}
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('params.sections.executionMode')}</h3>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>{t('params.fields.virus')}</label>
            <select
              className={styles.select}
              value={params.virus}
              onChange={e =>
                updateField('virus', e.target.value === 'custom' ? 'custom' : 'sars-cov2')
              }
            >
              <option value="sars-cov2">{t('params.fields.virusOptionSarsCov2')}</option>
              <option value="custom">{t('params.fields.virusOptionCustom')}</option>
            </select>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('params.sections.inputs')}</h3>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>{t('params.fields.inDir')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className={styles.input}
                style={{ flex: 1 }}
                type="text"
                value={params.inDir}
                onChange={e => updateField('inDir', e.target.value)}
                placeholder={t('params.placeholders.inDir')}
              />
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={async () => {
                  const selected = await window.api.selectDirectory(params.inDir);
                  if (selected) {
                    updateField('inDir', selected);
                  }
                }}
              >
                {t('params.buttons.selectFolder')}
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('params.fields.primersBED')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className={styles.input}
                style={{ flex: 1 }}
                type="text"
                value={params.primersBED}
                onChange={e => updateField('primersBED', e.target.value)}
              />
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={async () => {
                  const selected = await window.api.selectFile(params.primersBED);
                  if (selected) {
                    updateField('primersBED', selected);
                  }
                }}
              >
                {t('params.buttons.selectFile')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('params.sections.output')}</h3>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>{t('params.fields.outDir')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className={styles.input}
                style={{ flex: 1 }}
                type="text"
                value={params.outDir}
                onChange={e => updateField('outDir', e.target.value)}
                placeholder={t('params.placeholders.outDir')}
              />
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={async () => {
                  const selected = await window.api.selectDirectory(params.outDir);
                  if (selected) {
                    updateField('outDir', selected);
                  }
                }}
              >
                {t('params.buttons.selectFolder')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('params.sections.quality')}</h3>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>{t('params.fields.minLen')}</label>
            <input
              className={styles.input}
              type="number"
              value={params.minLen}
              onChange={e => updateField('minLen', Number(e.target.value) || 0)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('params.fields.depth')}</label>
            <input
              className={styles.input}
              type="number"
              value={params.depth}
              onChange={e => updateField('depth', Number(e.target.value) || 0)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('params.fields.mapping_quality')}</label>
            <input
              className={styles.input}
              type="number"
              value={params.mapping_quality}
              onChange={e => updateField('mapping_quality', Number(e.target.value) || 0)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('params.fields.base_quality')}</label>
            <input
              className={styles.input}
              type="number"
              value={params.base_quality}
              onChange={e => updateField('base_quality', Number(e.target.value) || 0)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('params.fields.trimLen')}</label>
            <input
              className={styles.input}
              type="number"
              value={params.trimLen}
              onChange={e => updateField('trimLen', Number(e.target.value) || 0)}
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('params.sections.intrahost')}</h3>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>{t('params.fields.minDpIntrahost')}</label>
            <input
              className={styles.input}
              type="number"
              value={params.minDpIntrahost}
              onChange={e => updateField('minDpIntrahost', Number(e.target.value) || 0)}
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('params.sections.performance')}</h3>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>{t('params.fields.nextflowSimCalls')}</label>
            <input
              className={styles.input}
              type="text"
              value={params.nextflowSimCalls}
              onChange={e => updateField('nextflowSimCalls', e.target.value)}
              placeholder={t('params.placeholders.nextflowSimCalls')}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('params.fields.fastp_threads')}</label>
            <input
              className={styles.input}
              type="number"
              value={params.fastp_threads}
              onChange={e => updateField('fastp_threads', Number(e.target.value) || 0)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t('params.fields.bwa_threads')}</label>
            <input
              className={styles.input}
              type="number"
              value={params.bwa_threads}
              onChange={e => updateField('bwa_threads', Number(e.target.value) || 0)}
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('params.sections.snpeff')}</h3>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={params.runSnpEff}
                onChange={e => updateField('runSnpEff', e.target.checked)}
              />{' '}
              {t('params.fields.runSnpEff')}
            </label>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={params.writeMappedReads}
                onChange={e => updateField('writeMappedReads', e.target.checked)}
              />{' '}
              {t('params.fields.writeMappedReads')}
            </label>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('params.sections.dedup')}</h3>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={params.dedup}
                onChange={e => updateField('dedup', e.target.checked)}
              />{' '}
              {t('params.fields.dedup')}
            </label>
          </div>
          {params.dedup && (
            <div className={styles.field}>
              <label className={styles.label}>{t('params.fields.ndedup')}</label>
              <input
                className={styles.input}
                type="number"
                value={params.ndedup}
                onChange={e => updateField('ndedup', Number(e.target.value) || 0)}
              />
            </div>
          )}
        </div>
      </section>

      {params.virus === 'custom' && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('params.sections.customMode')}</h3>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t('params.fields.refGenomeCode')}</label>
              <input
                className={styles.input}
                type="text"
                value={params.refGenomeCode}
                onChange={e => updateField('refGenomeCode', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('params.fields.referenceGFF')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className={styles.input}
                  style={{ flex: 1 }}
                  type="text"
                  value={params.referenceGFF}
                  onChange={e => updateField('referenceGFF', e.target.value)}
                />
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={async () => {
                    const selected = await window.api.selectFile(params.referenceGFF);
                    if (selected) {
                      updateField('referenceGFF', selected);
                    }
                  }}
                >
                  {t('params.buttons.selectFile')}
                </button>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('params.fields.referenceGenome')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className={styles.input}
                  style={{ flex: 1 }}
                  type="text"
                  value={params.referenceGenome}
                  onChange={e => updateField('referenceGenome', e.target.value)}
                />
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={async () => {
                    const selected = await window.api.selectFile(params.referenceGenome);
                    if (selected) {
                      updateField('referenceGenome', selected);
                    }
                  }}
                >
                  {t('params.buttons.selectFile')}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ParamsPage;