import type { FactTable } from "../optionsSlice";

export default function UpstreamBar({
  styles,
  factTable,
  status,
  onChangeFactTable,
  onForceRace,
}: {
  styles: Record<string, string>;
  factTable: FactTable;
  status: "idle" | "loading" | "success" | "error";
  onChangeFactTable: (t: FactTable) => void;
  onForceRace: () => void;
}) {
  return (
    <div className={styles.upstreamRow}>
      <label className={styles.labelRow}>
        Fact table:
        <select
          value={factTable}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            onChangeFactTable(v as FactTable);
          }}
        >
          <option value="">-- Select fact table --</option>
          <option value="orders">orders</option>
          <option value="users">users</option>
          <option value="pageviews">pageviews</option>
        </select>
      </label>

      <button onClick={onForceRace}>Force Race Condition</button>

      <span className={styles.muted}>
        status: <b>{status}</b>
      </span>
    </div>
  );
}
