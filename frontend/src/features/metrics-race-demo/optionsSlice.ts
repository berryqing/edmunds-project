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

  // options returned from backend (downstream selectable fields)
  tables: TableOptions[];
  status: "idle" | "loading" | "success" | "error";
  error?: string;

  // user selections
  dimensions: FieldRef[]; // group by fields
  filtersByTable: Record<string, FilterRow[]>; // per-table filters
};

const initialState: State = {
  factTable: "" as FactTable,
  joins: [],
  tables: [],
  status: "idle",
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

const slice = createSlice({
  name: "options",
  initialState,
  reducers: {
    setFactTable(state, action: PayloadAction<FactTable>) {
      state.factTable = action.payload;
      // 复现版：不做 invalidation（不清理维度/filters），让 UI 更容易进入“脏状态”
      // （后面修复时我们会加）
      state.joins = []; // 你业务是先选主表再选关联表，这里切主表就清空 joins
    },

    toggleJoin(state, action: PayloadAction<string>) {
      const t = action.payload;
      if (state.joins.includes(t))
        state.joins = state.joins.filter((x) => x !== t);
      else state.joins.push(t);
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
      .addCase(fetchOptions.pending, (state) => {
        state.status = "loading";
        state.error = undefined;
      })
      .addCase(fetchOptions.fulfilled, (state, action) => {
        state.status = "success";
        state.tables = action.payload; // ⚠️ 复现版：无条件接受，旧请求会覆盖新 options
      })
      .addCase(fetchOptions.rejected, (state, action) => {
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
