import { useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../app/store";
import {
  addFilterRow,
  fetchOptions,
  removeFilterRow,
  selectOptionsState,
  setFactTable,
  toggleDimension,
  toggleJoin,
  updateFilterRow,
  type FactTable,
  type FieldRef,
  type FilterRow,
  type Operator,
  type TableOptions,
} from "./optionsSlice";

import styles from "./MetricsRaceDemoPage.module.css";

import UpstreamBar from "./components/UpstreamBar";
import JoinSelector from "./components/JoinSelector";
import DimensionsPanel from "./components/DimensionsPanel";
import FiltersPanel from "./components/FiltersPanel";
import DebugState from "./components/DebugState";

const JOIN_CANDIDATES: Record<FactTable, string[]> = {
  orders: ["users", "pageviews"],
  users: ["orders", "pageviews"],
  pageviews: ["orders", "users"],
};

export default function MetricsRaceDemoPage() {
  const dispatch = useDispatch<AppDispatch>();
  const s = useSelector(selectOptionsState);

  const allFields: FieldRef[] = useMemo(() => {
    return s.tables.flatMap((t) => t.fields);
  }, [s.tables]);

  const tablesInPlay = useMemo(() => s.tables.map((t) => t.name), [s.tables]);

  // 复现分支：不自动 fetch（保持你现在的行为）
  useEffect(() => { dispatch(fetchOptions()); }, [dispatch, s.factTable, s.joins]);

  return (
    <div className={styles.page}>
      <h2>Metrics Config Race Demo (Repro Only)</h2>

      <UpstreamBar
        styles={styles}
        factTable={s.factTable}
        status={s.status}
        onChangeFactTable={(t) => dispatch(setFactTable(t))}
        onForceRace={() => {
          dispatch(setFactTable("orders"));
          dispatch(fetchOptions());

          setTimeout(() => {
            dispatch(setFactTable("users"));
            dispatch(fetchOptions());
          }, 10);

          setTimeout(() => {
            dispatch(setFactTable("pageviews"));
            dispatch(fetchOptions());
          }, 20);
        }}
      />

      <JoinSelector
        styles={styles}
        factTable={s.factTable}
        joins={s.joins}
        joinCandidates={JOIN_CANDIDATES}
        onToggleJoin={(j) => dispatch(toggleJoin(j))}
      />

      <hr className={styles.hr} />

      <div className={styles.twoColGrid}>
        <DimensionsPanel
          styles={styles}
          allFields={allFields}
          dimensions={s.dimensions}
          onToggleDimension={(f) => dispatch(toggleDimension(f))}
        />

        <FiltersPanel
          styles={styles}
          tablesInPlay={tablesInPlay}
          tables={s.tables as TableOptions[]}
          filtersByTable={s.filtersByTable as Record<string, FilterRow[]>}
          onAddFilterRow={(table) => dispatch(addFilterRow({ table }))}
          onUpdateFilterRow={(table, id, patch) =>
            dispatch(updateFilterRow({ table, id, patch }))
          }
          onRemoveFilterRow={(table, id) =>
            dispatch(removeFilterRow({ table, id }))
          }
        />
      </div>

      <hr className={styles.hr} />

      <DebugState styles={styles} state={s} />

      <p className={styles.reproTip}>
        Repro tip: 快速切换 fact table /
        joins，然后连续触发请求，你会看到旧请求返回覆盖最新 tables，
        导致字段列表/filters 可选项“复活”。
      </p>
    </div>
  );
}
