import React from 'react';
import { useTranslation } from 'react-i18next';
import logo from '../assets/viralflow_logo.png';
import styles from './Home.module.css';

interface HomeProps {
  goToParams: () => void;
}

const Home: React.FC<HomeProps> = ({ goToParams }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.root}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h2 className={styles.title}>{t('home.title')}</h2>
            <p className={styles.taglineLine1}>{t('home.taglineLine1')}</p>
            <p className={styles.taglineLine2}>{t('home.taglineLine2')}</p>
            <p className={styles.versionInfo}>{t('home.versionInfo')}</p>
            <div className={styles.actions}>
              <button className={styles.primaryButton} onClick={goToParams}>
                {t('home.goToParams')}
              </button>
            </div>
          </div>
          <div className={styles.heroLogoBox}>
            <img src={logo} alt="ViralFlow" className={styles.heroLogo} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
