import { useEffect, useRef, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NeedKey } from "../types";

const APS_INFRACTIONS_KEY = "zibu_aps_infractions_v1";
const APS_COSTS = [10, 20, 50]; // Cost to rescue at each infraction (1st, 2nd, 3rd)

export function useAPSSystem(
  needs: Record<NeedKey, number> | null,
  onCaptured?: () => void
) {
  const [isTakenByAPS, setIsTakenByAPS] = useState(false);
  const [justRescued, setJustRescued] = useState(false);
  const [apsInfractions, setApsInfractions] = useState(0);
  const lastAPSExitTimeRef = useRef<number>(0);

  // Initialize APS infractions from storage
  useEffect(() => {
    const init = async () => {
      try {
        const infraRaw = await AsyncStorage.getItem(APS_INFRACTIONS_KEY);
        if (infraRaw) {
          setApsInfractions(parseInt(infraRaw, 10));
        }
      } catch (e) {
        console.warn("Failed to load APS infractions", e);
      }
    };
    init();
  }, []);

  // Monitor needs to detect if all are at 0 (should trigger APS)
  useEffect(() => {
    if (!needs) return;

    // Don't trigger APS if we just rescued Zibu (within last 10 seconds)
    if (justRescued) return;
    if (Date.now() - lastAPSExitTimeRef.current < 10000) return;

    const allNeeds = Object.values(needs);
    const allAtZero = allNeeds.every((value) => value <= 0);

    if (allAtZero && !isTakenByAPS) {
      setIsTakenByAPS(true);
      onCaptured?.();
    }
  }, [needs, isTakenByAPS, justRescued, onCaptured]);

  const recordRescue = useCallback(async () => {
    const newInfraction = apsInfractions + 1;
    setApsInfractions(newInfraction);
    try {
      await AsyncStorage.setItem(APS_INFRACTIONS_KEY, newInfraction.toString());
    } catch (e) {
      console.warn("Failed to save APS infractions", e);
    }
  }, [apsInfractions]);

  const recordExit = useCallback(() => {
    lastAPSExitTimeRef.current = Date.now();
    setJustRescued(true);
    setIsTakenByAPS(false);
    // Re-enable APS monitoring after 10 seconds to give plenty of time for needs to stabilize
    setTimeout(() => setJustRescued(false), 10000);
  }, []);

  const resetAPS = useCallback(async () => {
    setApsInfractions(0);
    try {
      await AsyncStorage.setItem(APS_INFRACTIONS_KEY, "0");
    } catch (e) {
      console.warn("Failed to reset APS infractions", e);
    }
  }, []);

  return {
    isTakenByAPS,
    setIsTakenByAPS,
    justRescued,
    setJustRescued,
    apsInfractions,
    currentCost: apsInfractions < 3 ? APS_COSTS[apsInfractions] : 0,
    isPermanentLoss: apsInfractions >= 3,
    recordRescue,
    recordExit,
    resetAPS,
  };
}
