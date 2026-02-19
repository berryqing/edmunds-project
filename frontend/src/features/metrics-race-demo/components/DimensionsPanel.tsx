import type { FieldRef } from "../optionsSlice";

export default function DimensionsPanel({
  styles,
  allFields,
  dimensions,
  onToggleDimension,
}: {
  styles: Record<string, string>;
  allFields: FieldRef[];
  dimensions: FieldRef[];
  onToggleDimension: (f: FieldRef) => void;
}) {
  return (
    <section className={styles.panel}>
      <h3 className={styles.panelTitle}>Dimensions (Group By)</h3>
      <div className={styles.panelHint}>
        (Dimensions are selected from available fields)
      </div>

      {allFields.length === 0 ? (
        <div className={styles.emptyHint}>
          Click “Force Race Condition” to load fields.
        </div>
      ) : (
        <div className={styles.scrollList}>
          {allFields.map((f) => {
            const key = `${f.table}.${f.field}`;
            const checked = dimensions.some(
              (d) => `${d.table}.${d.field}` === key,
            );

            return (
              <label key={key} className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleDimension(f)}
                />
                <span>
                  {f.table}.{f.field}{" "}
                  <span className={styles.dimType}>({f.type})</span>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}
