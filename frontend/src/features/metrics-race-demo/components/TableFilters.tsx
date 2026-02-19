import type { FieldRef, FilterRow, Operator } from "../optionsSlice";

const OPS: Operator[] = ["=", "!=", ">", ">=", "<", "<=", "IN", "LIKE"];

export default function TableFilters({
  styles,
  table,
  tableFields,
  rows,
  onAdd,
  onUpdate,
  onRemove,
}: {
  styles: Record<string, string>;
  table: string;
  tableFields: FieldRef[];
  rows: FilterRow[];
  onAdd: () => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<FilterRow, "field" | "op" | "value">>,
  ) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className={styles.filterBlock}>
      <div className={styles.filterHeader}>
        <b>{table} filters</b>
        <button onClick={onAdd}>+ Add filter</button>
      </div>

      {rows.length === 0 ? (
        <div className={styles.emptyHint} style={{ marginTop: 8 }}>
          No filters.
        </div>
      ) : (
        <div className={styles.filterRows}>
          {rows.map((r) => (
            <div key={r.id} className={styles.filterRow}>
              {/* field */}
              <select
                value={r.field}
                onChange={(e) => onUpdate(r.id, { field: e.target.value })}
              >
                <option value="">Select field</option>
                {tableFields.map((f) => (
                  <option key={`${f.table}.${f.field}`} value={f.field}>
                    {f.field} ({f.type})
                  </option>
                ))}
              </select>

              {/* operator */}
              <select
                value={r.op}
                onChange={(e) =>
                  onUpdate(r.id, { op: e.target.value as Operator })
                }
              >
                {OPS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>

              {/* value */}
              <input
                placeholder="value"
                value={r.value}
                onChange={(e) => onUpdate(r.id, { value: e.target.value })}
              />

              <button onClick={() => onRemove(r.id)}>Del</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
