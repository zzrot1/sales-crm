import styles from "./index.module.css";

export function SettingsPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Administrare</p>
          <h2 className={styles.title}>Setari</h2>
          <p className={styles.description}>
            Profil user si gestionare rapida pentru membrii echipei.
          </p>
        </div>
      </section>

      <div className={`${styles.grid} ${styles.twoColumns}`}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Profil user</h3>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="name">Nume</label>
              <input id="name" defaultValue="Andreea Pop" />
            </div>
            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input id="email" defaultValue="andreea@acme.test" />
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Echipa</h3>
          <div className={styles.detailsList}>
            <div className={styles.detailItem}>
              <span>Andreea Pop</span>
              <strong>Admin</strong>
            </div>
            <div className={styles.detailItem}>
              <span>Mihai Radu</span>
              <strong>Sales</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
