import { useEffect, useMemo } from "react";
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
  type Operator,
} from "./optionsSlice";

const JOIN_CANDIDATES: Record<FactTable, string[]> = {
  orders: ["users", "pageviews"],
  users: ["orders", "pageviews"],
  pageviews: ["orders", "users"],
};

const OPS: Operator[] = ["=", "!=", ">", ">=", "<", "<=", "IN", "LIKE"];

export default function MetricsRaceDemoPage() {
  const dispatch = useDispatch<AppDispatch>();
  const s = useSelector(selectOptionsState);

  const allFields: FieldRef[] = useMemo(() => {
    return s.tables.flatMap((t) => t.fields);
  }, [s.tables]);

  const tablesInPlay = useMemo(() => s.tables.map((t) => t.name), [s.tables]);

  useEffect(() => {
    dispatch(fetchOptions());
  }, [dispatch, s.factTable, s.joins]);

  return (
    <div
      style={{
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto",
      }}
    >
      <h2>Metrics Config Race Demo (Repro Only)</h2>

      {/* Upstream */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Fact table:
          <select
            value={s.factTable}
            onChange={(e) =>
              dispatch(setFactTable(e.target.value as FactTable))
            }
          >
            <option value="orders">orders</option>
            <option value="users">users</option>
            <option value="pageviews">pageviews</option>
          </select>
        </label>

        {/* <button onClick={() => dispatch(fetchOptions())}>Fetch Options</button> */}

        <button
          onClick={() => {
            // 第一次请求：orders
            dispatch(setFactTable("orders"));
            dispatch(fetchOptions());

            // 立即切换配置并再发请求
            setTimeout(() => {
              dispatch(setFactTable("users"));
              dispatch(fetchOptions());
            }, 10);

            setTimeout(() => {
              dispatch(setFactTable("pageviews"));
              dispatch(fetchOptions());
            }, 20);
          }}
        >
          Force Race Condition
        </button>

        <span style={{ opacity: 0.75 }}>
          status: <b>{s.status}</b>
        </span>
      </div>

      {/* Joins */}
      <div style={{ marginTop: 12 }}>
        <b>Join tables (select after fact table):</b>
        <div
          style={{ marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap" }}
        >
          {JOIN_CANDIDATES[s.factTable].map((j) => (
            <label
              key={j}
              style={{ display: "flex", gap: 6, alignItems: "center" }}
            >
              <input
                type="checkbox"
                checked={s.joins.includes(j)}
                onChange={() => dispatch(toggleJoin(j))}
              />
              {j}
            </label>
          ))}
        </div>
        <div style={{ marginTop: 6, opacity: 0.75 }}>
          current joins: {s.joins.length ? s.joins.join(", ") : "—"}
        </div>
      </div>

      <hr style={{ margin: "16px 0" }} />

      {/* Downstream options */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Dimensions = choose from all fields */}
        <section
          style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}
        >
          <h3 style={{ marginTop: 0 }}>Dimensions (Group By)</h3>
          <div style={{ opacity: 0.75, marginBottom: 8 }}>
            (Dimensions are selected from available fields)
          </div>

          {allFields.length === 0 ? (
            <div style={{ opacity: 0.7 }}>
              Click “Fetch Options” to load fields.
            </div>
          ) : (
            <div
              style={{
                maxHeight: 260,
                overflow: "auto",
                display: "grid",
                gap: 6,
              }}
            >
              {allFields.map((f) => {
                const key = `${f.table}.${f.field}`;
                const checked = s.dimensions.some(
                  (d) => `${d.table}.${d.field}` === key,
                );
                return (
                  <label
                    key={key}
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => dispatch(toggleDimension(f))}
                    />
                    <span>
                      {f.table}.{f.field}{" "}
                      <span style={{ opacity: 0.7 }}>({f.type})</span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </section>

        {/* Filters per table */}
        <section
          style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}
        >
          <h3 style={{ marginTop: 0 }}>Filters (WHERE Builder)</h3>
          <div style={{ opacity: 0.75, marginBottom: 8 }}>
            Each table has its own filters: field / operator / value
          </div>

          {tablesInPlay.length === 0 ? (
            <div style={{ opacity: 0.7 }}>
              Click “Fetch Options” to load tables & fields.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {tablesInPlay.map((table) => (
                <TableFilters
                  key={table}
                  table={table}
                  dispatch={dispatch}
                  state={s}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <details>
        <summary>Debug: current state</summary>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(s, null, 2)}
        </pre>
      </details>

      <p style={{ marginTop: 12, opacity: 0.8 }}>
        Repro tip: 快速切换 fact table / joins，然后连续点 “Fetch
        Options”，你会看到旧请求返回覆盖最新 tables， 导致字段列表/filters
        可选项“复活”。
      </p>
    </div>
  );
}

function TableFilters({
  table,
  dispatch,
  state,
}: {
  table: string;
  dispatch: AppDispatch;
  state: ReturnType<typeof selectOptionsState>;
}) {
  const tableFields = state.tables.find((t) => t.name === table)?.fields ?? [];
  const rows = state.filtersByTable[table] ?? [];

  return (
    <div style={{ border: "1px dashed #bbb", borderRadius: 10, padding: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <b>{table} filters</b>
        <button onClick={() => dispatch(addFilterRow({ table }))}>
          + Add filter
        </button>
      </div>

      {rows.length === 0 ? (
        <div style={{ marginTop: 8, opacity: 0.7 }}>No filters.</div>
      ) : (
        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
          {rows.map((r) => (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 110px 1fr 70px",
                gap: 8,
              }}
            >
              {/* field */}
              <select
                value={r.field}
                onChange={(e) =>
                  dispatch(
                    updateFilterRow({
                      table,
                      id: r.id,
                      patch: { field: e.target.value },
                    }),
                  )
                }
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
                  dispatch(
                    updateFilterRow({
                      table,
                      id: r.id,
                      patch: { op: e.target.value as Operator },
                    }),
                  )
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
                onChange={(e) =>
                  dispatch(
                    updateFilterRow({
                      table,
                      id: r.id,
                      patch: { value: e.target.value },
                    }),
                  )
                }
              />

              <button
                onClick={() => dispatch(removeFilterRow({ table, id: r.id }))}
              >
                Del
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
