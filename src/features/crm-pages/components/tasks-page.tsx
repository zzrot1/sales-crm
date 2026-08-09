import styles from "./index.module.css";

const tasks = [
  ["Suna Atlas Medical", "Azi", "Andreea", "Deschis"],
  ["Trimite oferta Northstar", "Restant", "Mihai", "Urgent"],
  ["Verifica importul CSV", "Completat", "Ioana", "Done"],
];

export function TasksPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Activitate</p>
          <h2 className={styles.title}>Task-uri</h2>
          <p className={styles.description}>
            Toate task-urile echipei, filtrabile dupa azi, restante si
            completate.
          </p>
        </div>
      </section>

      <div className={styles.filters}>
        <button className={`${styles.filter} ${styles.activeFilter}`} type="button">
          Azi
        </button>
        <button className={styles.filter} type="button">
          Restante
        </button>
        <button className={styles.filter} type="button">
          Completate
        </button>
      </div>

      <section className={styles.tableCard}>
        <div className={`${styles.tableHead} ${styles.tasksTable}`}>
          <span>Task</span>
          <span>Filtru</span>
          <span>Owner</span>
          <span>Status</span>
        </div>
        {tasks.map(([task, filter, owner, status]) => (
          <div className={`${styles.tableRow} ${styles.tasksTable}`} key={task}>
            <span>{task}</span>
            <span>{filter}</span>
            <span>{owner}</span>
            <span>
              <span className={styles.status}>{status}</span>
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
