import { useEffect, useRef, useState, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NeedKey } from "../types";
import { applyDecay, getDecayPerMs } from "../utils/needs";

const STORAGE_KEY = "zibu_needs_v1";
const DECAY_PER_TICK = 0.01; // how much to lose each tick (0.01 = 1%)
const TICK_MS = 300000; // how often to decay, in ms

type StoredNeeds = {
  needs: Record<NeedKey, number>;
  lastUpdated: number;
};

export function useZibuNeeds(onboardingResetCounter?: number) {
  const [needs, setNeeds] = useState<Record<NeedKey, number> | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const decayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Initialize: load needs from storage
  useEffect(() => {
    const initialize = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved: StoredNeeds = JSON.parse(raw);
          const now = Date.now();
          const elapsedMs = now - saved.lastUpdated;
          if (elapsedMs > 0) {
            const decayPerMs = getDecayPerMs(DECAY_PER_TICK, TICK_MS);
            setNeeds(applyDecay(saved.needs, decayPerMs, elapsedMs));
          } else {
            setNeeds(saved.needs);
          }
        } else {
          setNeeds({ mood: 0.25, hunger: 0.25, clean: 0.25, rest: 0.25 });
        }
      } catch (e) {
        console.warn("Failed to initialize needs", e);
        setNeeds({ mood: 0.25, hunger: 0.25, clean: 0.25, rest: 0.25 });
      } finally {
        setIsInitialized(true);
      }
    };
    initialize();
  }, [onboardingResetCounter]);

  // Save needs to storage whenever they change
  useEffect(() => {
    if (needs === null) return;

    const saveState = async () => {
      const data: StoredNeeds = {
        needs,
        lastUpdated: Date.now(),
      };
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn("Failed to save needs", e);
      }
    };

    saveState();
  }, [needs]);

  // Start decay interval when initialized and app is active
  useEffect(() => {
    if (!isInitialized || needs === null) return;

    // Only start decay interval if app is active
    if (appState.current === "active") {
      decayIntervalRef.current = setInterval(() => {
        setNeeds((prev) => {
          if (!prev) return null;
          const next: Record<NeedKey, number> = { ...prev };
          (Object.keys(next) as NeedKey[]).forEach((key) => {
            next[key] = Math.max(0, next[key] - DECAY_PER_TICK);
          });
          return next;
        });
      }, TICK_MS);
    }

    return () => {
      if (decayIntervalRef.current) {
        clearInterval(decayIntervalRef.current);
        decayIntervalRef.current = null;
      }
    };
  }, [isInitialized]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      const prevState = appState.current;
      appState.current = nextState;

      // Going to background/inactive: save needs and pause decay interval
      if (
        prevState === "active" &&
        (nextState === "inactive" || nextState === "background")
      ) {
        // Pause the decay interval
        if (decayIntervalRef.current) {
          clearInterval(decayIntervalRef.current);
          decayIntervalRef.current = null;
        }

        if (needs !== null) {
          const data: StoredNeeds = {
            needs,
            lastUpdated: Date.now(),
          };
          try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          } catch (e) {
            console.warn("Failed to save needs on background", e);
          }
        }
      }
      // Came back to foreground: apply offline decay and resume decay interval
      if (
        (prevState === "inactive" || prevState === "background") &&
        nextState === "active"
      ) {
        await applyOfflineDecay();
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [needs]);

  const applyOfflineDecay = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved: StoredNeeds = JSON.parse(raw);
      const now = Date.now();
      const elapsedMs = now - saved.lastUpdated;

      if (elapsedMs <= 0) return;

      const decayPerMs = getDecayPerMs(DECAY_PER_TICK, TICK_MS);
      const decayedNeeds = applyDecay(saved.needs, decayPerMs, elapsedMs);

      // Update both state and storage with decayed needs
      setNeeds(decayedNeeds);
      const updatedData: StoredNeeds = {
        needs: decayedNeeds,
        lastUpdated: now,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    } catch (e) {
      console.warn("Failed to load/apply offline decay", e);
    }
  }, []);

  return {
    needs,
    isInitialized,
    setNeeds,
  };
}
