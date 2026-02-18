import { createAsyncThunk, createSlice, nanoid } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../../app/store";

export type FactTable = "orders" | "users" | "pageviews";
export type FieldType = "number" | "string" | "date";

export type FieldRef = {
  table: string;
  field: string;
  type: FieldType;
};

export type TableOptions = {
  name: string; // table name
  fields: FieldRef[]; // fields from this table
};

export type OptionsResponse = {
  factTable: FactTable;
  joins: string[];
  tables: TableOptions[];
  meta?: { delayMs?: number };
};

export type Operator = "=" | "!=" | ">" | ">=" | "<" | "<=" | "IN" | "LIKE";

export type FilterRow = {
  id: string;
  table: string; // which table this filter belongs to
  field: string;
  op: Operator;
  value: string;
};

type State = {
  // upstream config
  factTable: FactTable;
  joins: string[];

  // options returned from backend
  tables: TableOptions[];
  status: "idle" | "loading" | "success" | "error";
  error?: string;

  // step2 requestId guard: add a new state
  latestRequestId?: string;

  // user selections
  dimensions: FieldRef[]; // group by fields
  filtersByTable: Record<string, FilterRow[]>; // per-table filters
};

const initialState: State = {
  factTable: "orders",
  joins: [],
  tables: [],
  status: "idle",
  error: undefined,
  latestRequestId: undefined,
  dimensions: [],
  filtersByTable: {},
};

export const fetchOptions = createAsyncThunk<
  TableOptions[],
  void,
  { state: RootState }
>("options/fetch", async (_, thunkApi) => {
  const { factTable, joins } = thunkApi.getState().options;

  const res = await axios.get<OptionsResponse>(
    "http://localhost:3001/api/options",
    {
      params: {
        factTable,
        joins: joins.join(","),
      },
    },
  );

  return res.data.tables;
});
//**********************************************************************************************************************************/
// Historical approach: schema-based pruning of dependent state.
//
// Removed because pruning relied on potentially stale tables
// before async fetch completed, which could still allow race conditions.
//
// Current design uses:
// 1) Immediate downstream reset on upstream change
// 2) requestId-based async response guard
//
// This ensures strong UI consistency over time (async-safe).
//================================================================================

// // calculate the valid field set
// function buildAllowedFieldSet(tables: TableOptions[]) {
//   const set = new Set<string>();
//   for (const t of tables) {
//     for (const f of t.fields) {
//       set.add(`${t.name}.${f.field}`);
//     }
//   }
//   return set;
// }

// function buildAllowedTableSet(tables: TableOptions[]) {
//   return new Set(tables.map((t) => t.name));
// }

// function invalidateDependentState(state: State) {
//   const allowedTables = buildAllowedTableSet(state.tables);
//   const allowedFields = buildAllowedFieldSet(state.tables);

//   // 2.1 prune dimensions：移除不在 allowedFields 的
//   state.dimensions = state.dimensions.filter((d) =>
//     allowedFields.has(`${d.table}.${d.field}`),
//   );

//   // 2.2 prune filtersByTable
//   const next: Record<string, FilterRow[]> = {};
//   for (const [table, rows] of Object.entries(state.filtersByTable)) {
//     // 表不存在了：整块丢掉
//     if (!allowedTables.has(table)) continue;

//     // 表还在：逐行校验 field 是否还合法
//     const kept = rows.map((r) => {
//       const key = `${r.table}.${r.field}`;
//       // 如果 field 空或非法：把 field/value 清空（或你也可以直接删行）
//       if (!r.field || !allowedFields.has(key)) {
//         return { ...r, field: "", value: "" };
//       }
//       return r;
//     });

//     next[table] = kept;
//   }
//   state.filtersByTable = next;

//   // 2.3 options 置为 stale（可选，但强烈建议）
//   state.tables = [];
//   state.status = "idle"; // 或者 "loading" 看你 UI 怎么展示
// }
//**********************************************************************************************************************************/

const slice = createSlice({
  name: "options",
  initialState,
  reducers: {
    // unoptimized：not invalidation
    // setFactTable(state, action: PayloadAction<FactTable>) {
    //   state.factTable = action.payload;
    //   // 复现版：不做 invalidation（不清理维度/filters），让 UI 更容易进入“脏状态”
    //   // （后面修复时我们会加）
    //   state.joins = []; // 你业务是先选主表再选关联表，这里切主表就清空 joins
    // },

    //optimized：invalidation
    setFactTable(state, action: PayloadAction<FactTable>) {
      // if changed main table, clear all of the downstreams
      state.factTable = action.payload;
      state.joins = [];

      // Step 1: invalidate downstream
      state.dimensions = [];
      state.filtersByTable = {};
      state.tables = [];
      state.status = "idle";
      state.latestRequestId = undefined;
      state.error = undefined;
    },
    // unoptimized version:
    // toggleJoin(state, action: PayloadAction<string>) {
    //   const t = action.payload;
    //   if (state.joins.includes(t))
    //     state.joins = state.joins.filter((x) => x !== t);
    //   else state.joins.push(t);
    // },

    toggleJoin(state, action: PayloadAction<string>) {
      const t = action.payload;
      if (state.joins.includes(t))
        state.joins = state.joins.filter((x) => x !== t);
      else state.joins.push(t);

      // Step 1 (safe invalidation): join changes can invalidate schema,
      // so we clear all downstream selections + options immediately.
      state.dimensions = [];
      state.filtersByTable = {};
      state.tables = [];
      state.status = "idle";
      state.error = undefined;
      state.latestRequestId = undefined;
    },

    // Dimensions = pick from all fields
    toggleDimension(state, action: PayloadAction<FieldRef>) {
      const key = `${action.payload.table}.${action.payload.field}`;
      const exists = state.dimensions.some(
        (d) => `${d.table}.${d.field}` === key,
      );
      state.dimensions = exists
        ? state.dimensions.filter((d) => `${d.table}.${d.field}` !== key)
        : [...state.dimensions, action.payload];
    },

    // Filters builder (per table)
    addFilterRow(state, action: PayloadAction<{ table: string }>) {
      const table = action.payload.table;
      const row: FilterRow = {
        id: nanoid(),
        table,
        field: "",
        op: "=",
        value: "",
      };
      state.filtersByTable[table] = [
        ...(state.filtersByTable[table] ?? []),
        row,
      ];
    },

    updateFilterRow(
      state,
      action: PayloadAction<{
        table: string;
        id: string;
        patch: Partial<Pick<FilterRow, "field" | "op" | "value">>;
      }>,
    ) {
      const { table, id, patch } = action.payload;
      const rows = state.filtersByTable[table] ?? [];
      state.filtersByTable[table] = rows.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      );
    },

    removeFilterRow(
      state,
      action: PayloadAction<{ table: string; id: string }>,
    ) {
      const { table, id } = action.payload;
      const rows = state.filtersByTable[table] ?? [];
      state.filtersByTable[table] = rows.filter((r) => r.id !== id);
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchOptions.pending, (state, action) => {
        state.status = "loading";
        state.error = undefined;
        // ✅ Step2: mark this request as the latest
        state.latestRequestId = action.meta.requestId;
      })
      .addCase(fetchOptions.fulfilled, (state, action) => {
        // ✅ Step2: ignore stale responses
        if (state.latestRequestId !== action.meta.requestId) return;

        state.status = "success";
        state.tables = action.payload;
        state.error = undefined;
      })
      .addCase(fetchOptions.rejected, (state, action) => {
        // ✅ Step2: ignore stale errors too
        if (state.latestRequestId !== action.meta.requestId) return;
        state.status = "error";
        state.error = action.error?.message ?? "fetch failed";
      });
  },
});

export const {
  setFactTable,
  toggleJoin,
  toggleDimension,
  addFilterRow,
  updateFilterRow,
  removeFilterRow,
} = slice.actions;

export const selectOptionsState = (s: RootState) => s.options;

export default slice.reducer;
