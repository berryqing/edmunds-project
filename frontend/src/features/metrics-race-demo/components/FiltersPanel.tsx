import type { FilterRow, TableOptions } from "../optionsSlice";
import TableFilters from "./TableFilters";

export default function FiltersPanel({
  styles,
  tablesInPlay,
  tables,
  filtersByTable,
  onAddFilterRow,
  onUpdateFilterRow,
  onRemoveFilterRow,
}: {
  styles: Record<string, string>;
  tablesInPlay: string[];
  tables: TableOptions[];
  filtersByTable: Record<string, FilterRow[]>;
  onAddFilterRow: (table: string) => void;
  onUpdateFilterRow: (
    table: string,
    id: string,
    patch: Partial<Pick<FilterRow, "field" | "op" | "value">>,
  ) => void;
  onRemoveFilterRow: (table: string, id: string) => void;
}) {
  return (
    <section className={styles.panel}>
      <h3 className={styles.panelTitle}>Filters (WHERE Builder)</h3>
      <div className={styles.panelHint}>
        Each table has its own filters: field / operator / value
      </div>

      {tablesInPlay.length === 0 ? (
        <div className={styles.emptyHint}>
          Click “Force Race Condition” to load tables & fields.
        </div>
      ) : (
        <div className={styles.filtersList}>
          {tablesInPlay.map((table) => {
            const tableFields =
              tables.find((t) => t.name === table)?.fields ?? [];
            const rows = filtersByTable[table] ?? [];

            return (
              <TableFilters
                key={table}
                styles={styles}
                table={table}
                tableFields={tableFields}
                rows={rows}
                onAdd={() => onAddFilterRow(table)}
                onUpdate={(id, patch) => onUpdateFilterRow(table, id, patch)}
                onRemove={(id) => onRemoveFilterRow(table, id)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
