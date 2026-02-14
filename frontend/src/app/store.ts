import { configureStore } from "@reduxjs/toolkit";
import optionsReducer from "../features/metrics-race-demo/optionsSlice";

export const store = configureStore({
  reducer: {
    options: optionsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
