import type { selectOptionsState } from "../optionsSlice";

export default function DebugState({
  styles,
  state,
}: {
  styles: Record<string, string>;
  state: ReturnType<typeof selectOptionsState>;
}) {
  return (
    <details>
      <summary>Debug: current state</summary>
      <pre className={styles.debugPre}>{JSON.stringify(state, null, 2)}</pre>
    </details>
  );
}
