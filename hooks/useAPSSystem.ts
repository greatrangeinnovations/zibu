import { useEffect, useRef, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NeedKey } from "../types";

const APS_INFRACTIONS_KEY = "zibu_aps_infractions_v1";
const APS_RECOVERY_TIME_KEY = "zibu_aps_recovery_time_v1";
const APS_COSTS = [10, 20, 50]; // Cost to rescue at each infraction (1st, 2nd, 3rd)
const APS_RECOVERY_HOURS = 24; // Time to wait for free recovery

export function useAPSSystem(
  needs: Record<NeedKey, number> | null,
  onCaptured?: () => void
) {
  const [isTakenByAPS, setIsTakenByAPS] = useState(false);
  const [justRescued, setJustRescued] = useState(false);
  const [apsInfractions, setApsInfractions] = useState(0);
  const [apsRecoveryTime, setApsRecoveryTime] = useState<number | null>(null);
  const lastAPSExitTimeRef = useRef<number>(0);
  const apsInfractionsRef = useRef(0); // Track latest value for callbacks

  // Initialize APS infractions and recovery time from storage
  useEffect(() => {
    const init = async () => {
      try {
        const infraRaw = await AsyncStorage.getItem(APS_INFRACTIONS_KEY);
        const recoveryTimeRaw = await AsyncStorage.getItem(
          APS_RECOVERY_TIME_KEY
        );

        if (infraRaw) {
          const infra = parseInt(infraRaw, 10);
          setApsInfractions(infra);
          apsInfractionsRef.current = infra;
        }
        if (recoveryTimeRaw) {
          setApsRecoveryTime(parseInt(recoveryTimeRaw, 10));
        }
      } catch (e) {
        console.warn("Failed to load APS data", e);
      }
    };
    init();
  }, []);

  // Keep ref in sync with state
  useEffect(() => {
    apsInfractionsRef.current = apsInfractions;
  }, [apsInfractions]);

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
    // Increment infractions but cap at 2 (so max cost is always 50 coins)
    const newInfraction = Math.min(apsInfractionsRef.current + 1, 2);
    setApsInfractions(newInfraction);

    // Set recovery time to 24 hours from now
    const recoveryTime = Date.now() + APS_RECOVERY_HOURS * 60 * 60 * 1000;
    setApsRecoveryTime(recoveryTime);

    try {
      await AsyncStorage.setItem(APS_INFRACTIONS_KEY, newInfraction.toString());
      await AsyncStorage.setItem(
        APS_RECOVERY_TIME_KEY,
        recoveryTime.toString()
      );
    } catch (e) {
      console.warn("Failed to save APS data", e);
    }
  }, []); // No dependencies - uses ref

  const recordExit = useCallback(() => {
    lastAPSExitTimeRef.current = Date.now();
    setJustRescued(true);
    setIsTakenByAPS(false);
    // Re-enable APS monitoring after 10 seconds to give plenty of time for needs to stabilize
    setTimeout(() => setJustRescued(false), 10000);
  }, []);

  const resetAPS = useCallback(async () => {
    setApsInfractions(0);
    apsInfractionsRef.current = 0;
    setApsRecoveryTime(null);
    try {
      await AsyncStorage.setItem(APS_INFRACTIONS_KEY, "0");
      await AsyncStorage.removeItem(APS_RECOVERY_TIME_KEY);
    } catch (e) {
      console.warn("Failed to reset APS data", e);
    }
  }, []);

  const canRecoverForFree = apsRecoveryTime && Date.now() >= apsRecoveryTime;
  const recoveryTimeRemaining = apsRecoveryTime
    ? Math.max(0, apsRecoveryTime - Date.now())
    : 0;

  return {
    isTakenByAPS,
    setIsTakenByAPS,
    justRescued,
    setJustRescued,
    apsInfractions,
    currentCost: APS_COSTS[Math.min(apsInfractions, 2)], // Max cost is 50
    canRecoverForFree,
    recoveryTimeRemaining,
    apsRecoveryTime,
    recordRescue,
    recordExit,
    resetAPS,
  };
}
