import {
  CalendarClock,
  Mail,
  MessageSquare,
  NotebookPen,
  Phone,
  Send,
  StickyNote,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  ActivitiesActivityTypeDto,
  DealsDetailsDto,
  DealsUpdateRequest,
  DealsTaskDto,
  TaskTypeDto,
  UpdateTaskRequest,
} from "@/service-api/generated/models";

import {
  activityLabels,
  dealStageLabels,
  dealStages,
  formatDealValue,
  formatShortDate,
  getContactName,
  isOpenDealTask,
  sortByNewest,
  taskTypeLabels,
  toDateInputValue,
} from "../../utils/deal-helpers";
import styles from "../index.module.css";
import { MarkDealLostButton } from "./mark-deal-lost-button";

type DealDetailDrawerProps = {
  deal: DealsDetailsDto;
  isSaving: boolean;
  onAddActivity: (data: {
    contactId?: string | null;
    notes: string;
    type: ActivitiesActivityTypeDto;
  }) => void;
  onAddTask: (data: {
    dueDate?: string | null;
    title: string;
    type: TaskTypeDto;
  }) => void;
  onMarkLost: (reason: string) => void;
  onUpdateDeal: (data: DealsUpdateRequest) => void;
  onUpdateTask: (taskId: string, data: UpdateTaskRequest) => void;
};

export function DealDetailDrawer({
  deal,
  isSaving,
  onAddActivity,
  onAddTask,
  onMarkLost,
  onUpdateDeal,
  onUpdateTask,
}: DealDetailDrawerProps) {
  const [title, setTitle] = useState(deal.title);
  const [value, setValue] = useState(deal.value);
  const [closeDate, setCloseDate] = useState(toDateInputValue(deal.closeDate));
  const contactName = getContactName(deal.contact);

  return (
    <div className={styles.dealDetail}>
      <section className={styles.dealDetailHeader}>
        <div className={styles.dealDetailTitleGroup}>
          <label className={styles.dealInlineField}>
            <span>Titlu</span>
            <input
              value={title}
              onBlur={() => {
                if (title.trim() && title !== deal.title) {
                  onUpdateDeal({ title: title.trim() });
                }
              }}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <div className={styles.dealLinks}>
            <Link href={`/companies?search=${encodeURIComponent(deal.company.name)}`}>
              {deal.company.name}
            </Link>
            {contactName ? (
              <Link href={`/companies?search=${encodeURIComponent(contactName)}`}>
                {contactName}
              </Link>
            ) : null}
          </div>
        </div>

        <MarkDealLostButton isSaving={isSaving} onConfirm={onMarkLost} />
      </section>

      <section className={styles.dealDetailGrid}>
        <label className={styles.dealInlineField}>
          <span>Stage</span>
          <select
            value={deal.stage}
            onChange={(event) =>
              onUpdateDeal({ stage: event.target.value as typeof deal.stage })
            }
          >
            {dealStages.map((stage) => (
              <option key={stage} value={stage}>
                {dealStageLabels[stage]}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.dealInlineField}>
          <span>Valoare</span>
          <input
            inputMode="decimal"
            value={value}
            onBlur={() => {
              if (value !== deal.value) {
                onUpdateDeal({ value });
              }
            }}
            onChange={(event) => setValue(event.target.value)}
          />
          <small>{formatDealValue(value) ?? "Fara valoare"}</small>
        </label>

        <label className={styles.dealInlineField}>
          <span>Close date</span>
          <input
            type="date"
            value={closeDate}
            onBlur={() => {
              const nextValue = closeDate || null;
              if (nextValue !== toDateInputValue(deal.closeDate)) {
                onUpdateDeal({ closeDate: nextValue });
              }
            }}
            onChange={(event) => setCloseDate(event.target.value)}
          />
        </label>
      </section>

      <section className={styles.dealDetailColumns}>
        <DealActivities
          contactId={deal.contactId}
          deal={deal}
          isSaving={isSaving}
          onAddActivity={onAddActivity}
        />
        <DealTasks
          deal={deal}
          isSaving={isSaving}
          onAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
        />
      </section>
    </div>
  );
}

function DealActivities({
  contactId,
  deal,
  isSaving,
  onAddActivity,
}: {
  contactId: string | null;
  deal: DealsDetailsDto;
  isSaving: boolean;
  onAddActivity: DealDetailDrawerProps["onAddActivity"];
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [notes, setNotes] = useState("");
  const activities = useMemo(() => sortByNewest(deal.activities), [deal.activities]);

  return (
    <section className={styles.dealPanel}>
      <div className={styles.dealPanelHeader}>
        <h3>Activities</h3>
        <button
          className={styles.ghostButton}
          type="button"
          onClick={() => setIsAdding((current) => !current)}
        >
          <StickyNote size={15} /> Adauga nota
        </button>
      </div>

      {isAdding ? (
        <div className={styles.dealInlineForm}>
          <textarea
            value={notes}
            placeholder="Scrie o nota..."
            onChange={(event) => setNotes(event.target.value)}
          />
          <button
            className={styles.button}
            disabled={isSaving || !notes.trim()}
            type="button"
            onClick={() => {
              onAddActivity({ contactId, notes: notes.trim(), type: "NOTE" });
              setNotes("");
              setIsAdding(false);
            }}
          >
            <Send size={15} /> Salveaza
          </button>
        </div>
      ) : null}

      <div className={styles.dealList}>
        {activities.length ? (
          activities.map((activity) => (
            <article className={styles.dealListItem} key={activity.id}>
              <ActivityIcon type={activity.type} />
              <div>
                <strong>{activityLabels[activity.type]}</strong>
                <small>{formatShortDate(activity.createdAt)}</small>
                <p>{activity.notes || "Fara notes"}</p>
              </div>
            </article>
          ))
        ) : (
          <p className={styles.kanbanEmpty}>Nu exista activitati.</p>
        )}
      </div>
    </section>
  );
}

function DealTasks({
  deal,
  isSaving,
  onAddTask,
  onUpdateTask,
}: {
  deal: DealsDetailsDto;
  isSaving: boolean;
  onAddTask: DealDetailDrawerProps["onAddTask"];
  onUpdateTask: DealDetailDrawerProps["onUpdateTask"];
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskTypeDto>("CALL");
  const [dueDate, setDueDate] = useState("");
  const tasks = deal.tasks.filter(isOpenDealTask);

  return (
    <section className={styles.dealPanel}>
      <div className={styles.dealPanelHeader}>
        <h3>Tasks</h3>
        <button
          className={styles.ghostButton}
          type="button"
          onClick={() => setIsAdding((current) => !current)}
        >
          <CalendarClock size={15} /> Adauga task
        </button>
      </div>

      {isAdding ? (
        <div className={styles.dealInlineForm}>
          <input
            value={title}
            placeholder="Titlu task"
            onChange={(event) => setTitle(event.target.value)}
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value as TaskTypeDto)}
          >
            {Object.entries(taskTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
          <button
            className={styles.button}
            disabled={isSaving || !title.trim()}
            type="button"
            onClick={() => {
              onAddTask({
                dueDate: dueDate || null,
                title: title.trim(),
                type,
              });
              setTitle("");
              setDueDate("");
              setIsAdding(false);
            }}
          >
            <Send size={15} /> Salveaza
          </button>
        </div>
      ) : null}

      <div className={styles.dealList}>
        {tasks.length ? (
          tasks.map((task) => (
            <DealTaskItem
              isSaving={isSaving}
              key={task.id}
              task={task}
              onUpdateTask={onUpdateTask}
            />
          ))
        ) : (
          <p className={styles.kanbanEmpty}>Nu exista task-uri viitoare.</p>
        )}
      </div>
    </section>
  );
}

function DealTaskItem({
  isSaving,
  task,
  onUpdateTask,
}: {
  isSaving: boolean;
  task: DealsTaskDto;
  onUpdateTask: DealDetailDrawerProps["onUpdateTask"];
}) {
  const [title, setTitle] = useState(task.title);
  const [type, setType] = useState<TaskTypeDto>(task.type as TaskTypeDto);
  const [dueDate, setDueDate] = useState(toDateInputValue(task.dueDate));

  const saveTitle = () => {
    const nextTitle = title.trim();
    if (nextTitle && nextTitle !== task.title) {
      onUpdateTask(task.id, { title: nextTitle });
    }
  };

  const saveDueDate = () => {
    const nextDueDate = dueDate || null;
    if (nextDueDate !== toDateInputValue(task.dueDate)) {
      onUpdateTask(task.id, { dueDate: nextDueDate });
    }
  };

  return (
    <article className={styles.dealListItem}>
      <CalendarClock size={17} />
      <div className={styles.dealTaskEditor}>
        <input
          disabled={isSaving}
          value={title}
          onBlur={saveTitle}
          onChange={(event) => setTitle(event.target.value)}
        />
        <select
          disabled={isSaving}
          value={type}
          onChange={(event) => {
            const nextType = event.target.value as TaskTypeDto;
            setType(nextType);
            onUpdateTask(task.id, { type: nextType });
          }}
        >
          {Object.entries(taskTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          disabled={isSaving}
          type="date"
          value={dueDate}
          onBlur={saveDueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
        <p>{dueDate ? formatShortDate(dueDate) : "Fara target date"}</p>
      </div>
    </article>
  );
}

function ActivityIcon({ type }: { type: ActivitiesActivityTypeDto }) {
  const icons = {
    CALL: Phone,
    EMAIL: Mail,
    LINKEDIN: Users,
    MEETING: MessageSquare,
    NOTE: NotebookPen,
  };
  const Icon = icons[type];

  return <Icon size={17} />;
}
