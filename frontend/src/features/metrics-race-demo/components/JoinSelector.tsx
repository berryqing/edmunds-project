import type { FactTable } from "../optionsSlice";

export default function JoinSelector({
  styles,
  factTable,
  joins,
  joinCandidates,
  onToggleJoin,
}: {
  styles: Record<string, string>;
  factTable: FactTable;
  joins: string[];
  joinCandidates: Record<FactTable, string[]>;
  onToggleJoin: (j: string) => void;
}) {
  const list = joinCandidates[factTable] ?? [];

  return (
    <div className={styles.joinBlock}>
      <b>Join tables (select after fact table):</b>

      <div className={styles.joinRow}>
        {list.map((j) => (
          <label key={j} className={styles.joinItem}>
            <input
              type="checkbox"
              checked={joins.includes(j)}
              onChange={() => onToggleJoin(j)}
            />
            {j}
          </label>
        ))}
      </div>

      <div className={styles.muted}>
        current joins: {joins.length ? joins.join(", ") : "—"}
      </div>
    </div>
  );
}
