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

  activeRequestId?: string;
};

const initialState: State = {
  factTable: "" as FactTable,
  joins: [],
  tables: [],
  status: "idle",
  dimensions: [],
  filtersByTable: {},
  activeRequestId: undefined,
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
      state.joins = [];
      state.tables = [];
      state.dimensions = [];
      state.filtersByTable = {};
      state.status = "idle";
      state.activeRequestId = undefined;
    },

    toggleJoin(state, action: PayloadAction<string>) {
      const t = action.payload;
      if (state.joins.includes(t))
        state.joins = state.joins.filter((x) => x !== t);
      else state.joins.push(t);

      state.tables = [];
      state.dimensions = [];
      state.filtersByTable = {};

      state.status = "idle";
      state.activeRequestId = undefined;
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
        state.activeRequestId = action.meta.requestId;
      })
      .addCase(fetchOptions.fulfilled, (state, action) => {
        // ignore the outdated responses
        if (state.activeRequestId !== action.meta.requestId) return;

        state.status = "success";
        state.tables = action.payload; // 
      })
      .addCase(fetchOptions.rejected, (state, action) => {
        // ignore the outdated failures, to prevent old failures from being overwritten
        if (state.activeRequestId !== action.meta.requestId) return;
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
