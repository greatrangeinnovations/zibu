import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

export interface AppStateCallbacks {
  onBackground?: () => void | Promise<void>;
  onForeground?: () => void | Promise<void>;
}

/**
 * Hook to handle app state changes (foreground/background/inactive)
 * Useful for pausing/resuming timers, saving state, applying offline updates, etc.
 */
export function useAppStateListener(callbacks: AppStateCallbacks) {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      const prevState = appState.current;
      appState.current = nextState;

      // Going to background/inactive
      if (
        prevState === "active" &&
        (nextState === "inactive" || nextState === "background")
      ) {
        await callbacks.onBackground?.();
      }

      // Coming back to foreground
      if (
        (prevState === "inactive" || prevState === "background") &&
        nextState === "active"
      ) {
        await callbacks.onForeground?.();
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [callbacks]);
}
