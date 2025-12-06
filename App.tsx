import React, { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  Modal,
  PanResponder,
  Alert,
} from "react-native";
import { AppState, AppStateStatus } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";
import { Accelerometer } from "expo-sensors";
import AsyncStorage from "@react-native-async-storage/async-storage";

import styles from "./App.styles";
import StatusCircle from "./components/StatusCircle";
import SwatchModal from "./components/SwatchModal";
import ZibuSprite from "./components/ZibuSprite";
import { useCoins, FOOD_TYPES } from "./contexts/CoinContext";
import {
  FRAME_COUNT,
  COLS,
  ROWS,
  DISPLAY_SIZE,
  FPS,
  PLAYING_COLS,
  PLAYING_ROWS,
  PLAYING_FRAME_COUNT,
  PLAYING_FPS,
  SLEEP_FRAME_COUNT,
  SLEEP_COLS,
  SLEEP_ROWS,
  SLEEP_FPS,
  EAT_FRAME_COUNT,
  EAT_COLS,
  EAT_ROWS,
  EAT_FPS,
  UPSET_FRAME_COUNT,
  UPSET_COLS,
  UPSET_ROWS,
  UPSET_FPS,
} from "./constants/animation";
import { applyDecay, getDecayPerMs } from "./utils/needs";

type ActiveMode = "feed" | "clean" | "play" | "sleep" | null;

const STORAGE_KEY = "zibu_needs_v1";

type StoredNeeds = {
  needs: Record<NeedKey, number>;
  lastUpdated: number;
};

import type { NeedKey } from "./types";

const DECAY_PER_TICK = 0.01; // how much to lose each tick (0.01 = 1%)
const TICK_MS = 300000; // how often to decay, in ms

const HATCH_SHAKE_TARGET = 20; // Number of shakes required to hatch
const HATCH_STORAGE_KEY = "zibu_hatched_v1";
const AGE_STORAGE_KEY = "zibu_age_v1"; // Timestamp when hatched
const APS_INFRACTIONS_KEY = "zibu_aps_infractions_v1"; // Number of APS infractions
const APS_COSTS = [10, 20, 50]; // Cost to rescue at each infraction (1st, 2nd, 3rd)

export default function HomeScreen() {
  const {
    coins,
    inventory,
    subtractInventoryItem,
    getTotalFood,
    subtractCoins,
    durability,
    useDurableItem,
  } = useCoins();
  // Needs state
  const [needs, setNeeds] = useState<Record<NeedKey, number> | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Hatching state
  const [isHatched, setIsHatched] = useState<boolean | null>(null);
  const [hatchShakeCount, setHatchShakeCount] = useState(0);
  const [hatchTime, setHatchTime] = useState<number | null>(null); // Timestamp when hatched
  const [age, setAge] = useState(0); // Days old
  const [apsInfractions, setApsInfractions] = useState(0); // Number of times taken by APS

  // APS (Alien Protective Services) state
  const [isTakenByAPS, setIsTakenByAPS] = useState(false);

  // Track which action is currently active
  const [activeMode, setActiveMode] = useState<ActiveMode>(null);

  // Swatch modals and selections
  const [foodSwatchOpen, setFoodSwatchOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<string | null>(null);
  const selectedFoodRef = useRef<string | null>(null);

  const [cleanSwatchOpen, setCleanSwatchOpen] = useState(false);
  const [selectedCleanTool, setSelectedCleanTool] = useState<string | null>(
    null
  );

  const [toySwatchOpen, setToySwatchOpen] = useState(false);
  const [selectedToy, setSelectedToy] = useState<string | null>(null);

  const [sleepSwatchOpen, setSleepSwatchOpen] = useState(false);
  const [selectedSleepItem, setSelectedSleepItem] = useState<string | null>(
    null
  );

  // Diagnostic: check all modal visibilities
  if (
    typeof foodSwatchOpen !== "boolean" ||
    typeof cleanSwatchOpen !== "boolean" ||
    typeof toySwatchOpen !== "boolean" ||
    typeof sleepSwatchOpen !== "boolean"
  ) {
    throw new Error(
      `Modal state type error: foodSwatchOpen=${typeof foodSwatchOpen}, cleanSwatchOpen=${typeof cleanSwatchOpen}, toySwatchOpen=${typeof toySwatchOpen}, sleepSwatchOpen=${typeof sleepSwatchOpen}`
    );
  }

  // Activity states
  const [isPlaying, setIsPlaying] = useState(false); // Controls animation
  const [isShaking, setIsShaking] = useState(false); // True while shaking
  const [isSleeping, setIsSleeping] = useState(false);
  const [isFeeding, setIsFeeding] = useState(false);

  // Animation frames
  const [frame, setFrame] = useState(0);
  const [sleepFrame, setSleepFrame] = useState(0);
  const [playFrame, setPlayFrame] = useState(0);
  const [eatFrame, setEatFrame] = useState(0);
  const [upsetFrame, setUpsetFrame] = useState(0);

  // Upset state
  const [isUpset, setIsUpset] = useState(false);

  // Coin modal
  const [coinModalOpen, setCoinModalOpen] = useState(false);

  // Refs for effects and gesture state
  const isCleaningRef = useRef(false);
  const isPlayingRef = useRef(false);
  const isFeedingRef = useRef(false);
  const lastShakeRef = useRef<number>(0);
  const feedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const foodUsedRef = useRef(0); // Track food used in current feeding session
  const hasPlayedUpsetRef = useRef(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const decayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isCleaningRef.current,
      onMoveShouldSetPanResponder: () => isCleaningRef.current,
      onPanResponderRelease: (evt, gestureState) => {
        // Detect horizontal swipe (distance > 20px)
        if (Math.abs(gestureState.dx) > 20 && isCleaningRef.current) {
          // Use 4% of the sponge's durability per swipe (25 swipes to destroy)
          useDurableItem("old_sponge", 0.04);
          setNeeds((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              clean: Math.min(1, prev.clean + 0.01),
            };
          });
        }
      },
    })
  ).current;

  // Refs for feeding
  const selectedFoodHungerIncreaseRef = useRef(0);
  const inventoryRef = useRef(inventory);

  // Monitor needs to detect if all are at 0
  useEffect(() => {
    if (!needs) return;

    const allNeeds = Object.values(needs);
    const allAtZero = allNeeds.every((value) => value <= 0);

    if (allAtZero && !isTakenByAPS) {
      setIsTakenByAPS(true);
    }
  }, [needs, isTakenByAPS]);

  // Initialize: load needs and hatching state from storage
  useEffect(() => {
    const initialize = async () => {
      try {
        // Load hatching state
        const hatchedRaw = await AsyncStorage.getItem(HATCH_STORAGE_KEY);
        setIsHatched(hatchedRaw === "true");

        // Load age and infractions
        const ageRaw = await AsyncStorage.getItem(AGE_STORAGE_KEY);
        if (ageRaw) {
          const hatchedAt = parseInt(ageRaw, 10);
          setHatchTime(hatchedAt);
          const ageInMs = Date.now() - hatchedAt;
          const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
          setAge(ageInDays);
        }

        const infraRaw = await AsyncStorage.getItem(APS_INFRACTIONS_KEY);
        if (infraRaw) {
          setApsInfractions(parseInt(infraRaw, 10));
        }

        // Load needs
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
          setNeeds({ mood: 0.5, hunger: 0.04, clean: 0.5, rest: 0.1 });
        }
      } catch (e) {
        console.warn("Failed to initialize needs/hatch", e);
        setNeeds({ mood: 0.5, hunger: 0.04, clean: 0.5, rest: 0.1 });
        setIsHatched(false);
      } finally {
        setIsInitialized(true);
      }
    };
    initialize();
  }, []);

  // Update age periodically
  useEffect(() => {
    if (!hatchTime) return;

    const updateAge = () => {
      const ageInMs = Date.now() - hatchTime;
      const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
      setAge(ageInDays);
    };

    updateAge(); // Update immediately
    const interval = setInterval(updateAge, 1000 * 60 * 60); // Update every hour
    return () => clearInterval(interval);
  }, [hatchTime]);

  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      const prevState = appState.current;
      appState.current = nextState;

      // Going to background/inactive: save needs, timestamp, and pause decay interval
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
        applyOfflineDecay();
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [needs]);

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

  // Sleep animation effect
  useEffect(() => {
    if (!isSleeping) {
      setSleepFrame(0);
      return;
    }

    let isAnimating = true;
    let startTime = Date.now();

    const animate = () => {
      if (!isAnimating) return;

      const elapsed = Date.now() - startTime;
      const expectedFrame = Math.floor((elapsed / 1000) * SLEEP_FPS);

      if (expectedFrame < SLEEP_FRAME_COUNT) {
        setSleepFrame(expectedFrame);
        requestAnimationFrame(animate);
      } else {
        // Stay on last frame (sleeping)
        setSleepFrame(SLEEP_FRAME_COUNT - 1);
      }
    };

    animate();

    return () => {
      isAnimating = false;
    };
  }, [isSleeping]);

  // Animation: alternate between single and double blink
  useEffect(() => {
    let isPlaying = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const playBlink = (count: number, speed: number = FPS) => {
      return new Promise<void>((resolve) => {
        let blinkCount = 0;

        const playOnce = () => {
          let startTime = Date.now();
          const animate = () => {
            if (!isPlaying) return;
            const elapsed = Date.now() - startTime;
            const expectedFrame = Math.floor((elapsed / 1000) * speed);

            if (expectedFrame < FRAME_COUNT) {
              setFrame(expectedFrame);
              requestAnimationFrame(animate);
            } else {
              setFrame(0);
              blinkCount++;

              if (blinkCount < count) {
                // Wait 200ms between blinks, then play again
                timeoutId = setTimeout(playOnce, 200);
              } else {
                // All blinks done
                resolve();
              }
            }
          };
          animate();
        };

        playOnce();
      });
    };

    const startAnimation = async () => {
      while (isPlaying) {
        // Single blink at normal speed
        await playBlink(1, FPS);
        if (!isPlaying) break;

        // Wait 2 seconds
        await new Promise((resolve) => {
          timeoutId = setTimeout(resolve, 2000);
        });
        if (!isPlaying) break;

        // Double blink at faster speed (25 FPS instead of 15)
        await playBlink(2, 26);
        if (!isPlaying) break;

        // Wait 5 seconds
        await new Promise((resolve) => {
          timeoutId = setTimeout(resolve, 5000);
        });
      }
    };

    const timeout = setTimeout(() => startAnimation(), 500);

    return () => {
      isPlaying = false;
      if (timeout) clearTimeout(timeout);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Update cleaning ref when tool selection changes
  useEffect(() => {
    isCleaningRef.current = selectedCleanTool !== null;
  }, [selectedCleanTool]);

  // Keep selectedFoodRef in sync with state
  useEffect(() => {
    selectedFoodRef.current = selectedFood;
  }, [selectedFood]);

  // Keep inventoryRef in sync with context
  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  // Update playing ref when toy selection changes
  useEffect(() => {
    isPlayingRef.current = selectedToy !== null;
    if (!selectedToy) {
      setIsShaking(false);
      setIsPlaying(false);
    }
  }, [selectedToy]);

  // Accelerometer for hatching and play
  useEffect(() => {
    let subscription: any;
    let shakeTimeout: NodeJS.Timeout | null = null;

    const setupAccelerometer = async () => {
      await Accelerometer.setUpdateInterval(100);
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        const acceleration = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();

        // Hatching screen: count shakes
        if (isHatched === false && acceleration > 2) {
          setHatchShakeCount((count) => {
            const next = count + 1;
            if (next >= HATCH_SHAKE_TARGET) {
              setIsHatched(true);
              const now = Date.now();
              setHatchTime(now);
              setAge(0);
              AsyncStorage.setItem(HATCH_STORAGE_KEY, "true");
              AsyncStorage.setItem(AGE_STORAGE_KEY, now.toString());
              AsyncStorage.setItem(APS_INFRACTIONS_KEY, "0");
            }
            return next;
          });
        }

        // Main app play logic
        if (
          isHatched &&
          acceleration > 2 &&
          isPlayingRef.current &&
          now - lastShakeRef.current > 500
        ) {
          lastShakeRef.current = now;
          // Use 4% of the toy's durability per shake (25 shakes to destroy)
          useDurableItem("deflated_ball", 0.04);
          setNeeds((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              mood: Math.min(1, prev.mood + 0.01),
            };
          });
          setIsShaking(true);
          if (shakeTimeout) clearTimeout(shakeTimeout);
          setIsPlaying(true);
          shakeTimeout = setTimeout(() => {
            setIsShaking(false);
          }, 600);
        }
      });
    };

    setupAccelerometer();
    applyOfflineDecay();

    return () => {
      subscription?.remove();
      if (shakeTimeout) clearTimeout(shakeTimeout);
    };
  }, [isHatched]);

  // Sleep effect: increase rested by 1% per second when sleeping
  useEffect(() => {
    if (!isSleeping) return;
    const interval = setInterval(() => {
      // Use 0.4% of blanket's durability per second of sleep (25 seconds = 10%, 250 seconds = 100%)
      useDurableItem("tattered_blanket", 0.004);
      setNeeds((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          rest: Math.min(1, prev.rest + 0.01),
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSleeping, useDurableItem]);

  // Eat animation effect - loops continuously while feeding
  useEffect(() => {
    if (!isFeeding) {
      setEatFrame(0);
      return;
    }

    let isAnimating = true;
    let startTime = Date.now();

    const animate = () => {
      if (!isAnimating || !isFeeding) return;

      const elapsed = Date.now() - startTime;
      const expectedFrame =
        Math.floor((elapsed / 1000) * EAT_FPS) % EAT_FRAME_COUNT;

      setEatFrame(expectedFrame);
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      isAnimating = false;
    };
  }, [isFeeding]);

  // Play animation: only play while shaking, and finish cycle when shaking stops
  useEffect(() => {
    if (!isPlaying) {
      setPlayFrame(0);
      return;
    }

    let isAnimating = true;
    let startTime = Date.now();
    let finished = false;

    const animate = () => {
      if (!isAnimating) return;

      const elapsed = Date.now() - startTime;
      let frameIdx = Math.floor((elapsed / 1000) * PLAYING_FPS);
      if (frameIdx >= PLAYING_FRAME_COUNT) {
        frameIdx = PLAYING_FRAME_COUNT - 1;
        finished = true;
      }
      setPlayFrame(frameIdx);

      // If shaking, keep looping
      if (isShaking) {
        if (frameIdx === PLAYING_FRAME_COUNT - 1) {
          // Restart animation
          startTime = Date.now();
          finished = false;
        }
        requestAnimationFrame(animate);
      } else {
        // Not shaking: finish current cycle, then stop
        if (frameIdx < PLAYING_FRAME_COUNT - 1) {
          requestAnimationFrame(animate);
        } else {
          setIsPlaying(false);
        }
      }
    };

    animate();

    return () => {
      isAnimating = false;
    };
  }, [isPlaying, isShaking]);

  // Upset animation effect - plays once when meter drops below 10%
  useEffect(() => {
    if (!needs) return; // Not initialized yet
    // Check if any meter is below 10%
    const anyMeterCritical = Object.values(needs).some((value) => value < 0.1);

    if (anyMeterCritical && !hasPlayedUpsetRef.current) {
      // Trigger upset animation
      setIsUpset(true);
      hasPlayedUpsetRef.current = true;
    } else if (!anyMeterCritical && hasPlayedUpsetRef.current) {
      // Reset when all meters are back above 10%
      hasPlayedUpsetRef.current = false;
      setIsUpset(false);
      setUpsetFrame(0);
    }
  }, [needs]);

  // Play upset animation frames
  useEffect(() => {
    if (!isUpset) return;

    let isAnimating = true;
    let startTime = Date.now();

    const animate = () => {
      if (!isAnimating) return;

      const elapsed = Date.now() - startTime;
      const expectedFrame = Math.floor((elapsed / 1000) * UPSET_FPS);

      if (expectedFrame < UPSET_FRAME_COUNT) {
        setUpsetFrame(expectedFrame);
        requestAnimationFrame(animate);
      } else {
        // Stay on last frame
        setUpsetFrame(UPSET_FRAME_COUNT - 1);
      }
    };

    animate();

    return () => {
      isAnimating = false;
    };
  }, [isUpset]);

  // Slowly decrease each need over time
  useEffect(() => {
    if (!isInitialized) return; // Wait for initialization

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

  // Resume decay interval when returning to foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (
        nextState === "active" &&
        isInitialized &&
        !decayIntervalRef.current
      ) {
        // Restart the decay interval when returning to foreground
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
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [isInitialized]);

  const applyOfflineDecay = async () => {
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
  };

  // Show loading or hatching screen
  if (!isInitialized || needs === null || isHatched === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isHatched) {
    // Hatching screen
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#F6F6F6" }]}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Image
            source={require("./assets/egg/egg.png")}
            style={{ width: 220, height: 220, marginBottom: 32 }}
            contentFit="contain"
          />
          <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 12 }}>
            Shake to Hatch!
          </Text>
          <View
            style={{
              width: 180,
              height: 18,
              backgroundColor: "#eee",
              borderRadius: 9,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: `${Math.min(
                  100,
                  (hatchShakeCount / HATCH_SHAKE_TARGET) * 100
                )}%`,
                height: "100%",
                backgroundColor: "#6DD19C",
              }}
            />
          </View>
          <Text style={{ fontSize: 16, color: "#888" }}>
            {hatchShakeCount} / {HATCH_SHAKE_TARGET} shakes
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isTakenByAPS) {
    // APS taken Zibu screen - with escalating costs and permanent loss on 3rd infraction
    const currentInfraction = apsInfractions + 1; // Next infraction number
    const isPermanentLoss = currentInfraction > 3; // Game over on 4th attempt
    const rescueCost =
      currentInfraction <= 3 ? APS_COSTS[currentInfraction - 1] : 0;

    const handleRescueZibu = async () => {
      if (isPermanentLoss) return; // Cannot rescue on permanent loss

      if (coins >= rescueCost) {
        subtractCoins(rescueCost);

        // Increment infractions
        const newInfraction = apsInfractions + 1;
        setApsInfractions(newInfraction);
        await AsyncStorage.setItem(
          APS_INFRACTIONS_KEY,
          newInfraction.toString()
        );

        setIsTakenByAPS(false);
        // Reset needs to default values
        setNeeds({
          mood: 0.5,
          hunger: 0.5,
          clean: 0.5,
          rest: 0.5,
        });
      } else {
        Alert.alert(
          "Not Enough Coins",
          `You need ${rescueCost} coins to rescue Zibu from APS!`
        );
      }
    };

    const handleStartOver = async () => {
      // Reset everything for a fresh start
      await AsyncStorage.removeItem(HATCH_STORAGE_KEY);
      await AsyncStorage.removeItem(AGE_STORAGE_KEY);
      await AsyncStorage.removeItem(APS_INFRACTIONS_KEY);
      await AsyncStorage.removeItem(STORAGE_KEY);

      setIsHatched(false);
      setHatchShakeCount(0);
      setHatchTime(null);
      setAge(0);
      setApsInfractions(0);
      setIsTakenByAPS(false);
      setNeeds(null);
    };

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#1a1a2e" }]}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20,
          }}
        >
          {isPermanentLoss ? (
            <>
              <FontAwesome5
                name="skull"
                size={80}
                color="#FF3333"
                style={{ marginBottom: 20 }}
              />
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "700",
                  color: "#fff",
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                Zibu is Gone Forever
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: "#ccc",
                  marginBottom: 24,
                  textAlign: "center",
                }}
              >
                The APS has permanently taken Zibu. You failed to care for them
                too many times. Start over with a new Zibu.
              </Text>
              <Pressable
                onPress={handleStartOver}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  backgroundColor: "#6DD19C",
                  borderRadius: 8,
                  width: "100%",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontSize: 18, fontWeight: "600", color: "#fff" }}
                >
                  Start Over with New Zibu
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <FontAwesome5
                name="space-shuttle"
                size={80}
                color="#FF6B6B"
                style={{ marginBottom: 20 }}
              />
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "700",
                  color: "#fff",
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                Zibu Taken by APS!
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#aaa",
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                Infraction #{currentInfraction} of 3
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: "#ccc",
                  marginBottom: 24,
                  textAlign: "center",
                }}
              >
                The Alien Protective Services have taken Zibu due to poor care.
                Pay {rescueCost} coins to get them back!
              </Text>
              {currentInfraction === 3 && (
                <View
                  style={{
                    backgroundColor: "#FF6B6B",
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 20,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: "#fff",
                      textAlign: "center",
                    }}
                  >
                    ⚠️ WARNING: One more infraction and Zibu is GONE FOREVER
                  </Text>
                </View>
              )}
              <View
                style={{
                  backgroundColor: "#FF6B6B",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: "#fff",
                    textAlign: "center",
                  }}
                >
                  Cost: {rescueCost} coins
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 16,
                  color: "#aaa",
                  marginBottom: 32,
                  textAlign: "center",
                }}
              >
                Current coins: {coins}
              </Text>
              <Pressable
                onPress={handleRescueZibu}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  backgroundColor: coins >= rescueCost ? "#6DD19C" : "#999",
                  borderRadius: 8,
                  width: "100%",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontSize: 18, fontWeight: "600", color: "#fff" }}
                >
                  {coins >= rescueCost ? "Rescue Zibu" : "Not Enough Coins"}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <View {...panResponder.panHandlers}>
          <View
            style={{
              width: DISPLAY_SIZE,
              height: DISPLAY_SIZE,
              overflow: "hidden",
              borderRadius: 12,
            }}
          >
            <ZibuSprite
              isPlaying={isPlaying}
              isUpset={isUpset}
              isSleeping={isSleeping}
              isFeeding={isFeeding}
              frame={frame}
              sleepFrame={sleepFrame}
              eatFrame={eatFrame}
              playFrame={playFrame}
              upsetFrame={upsetFrame}
              DISPLAY_SIZE={DISPLAY_SIZE}
              COLS={COLS}
              ROWS={ROWS}
              SLEEP_COLS={SLEEP_COLS}
              SLEEP_ROWS={SLEEP_ROWS}
              EAT_COLS={EAT_COLS}
              EAT_ROWS={EAT_ROWS}
              UPSET_COLS={UPSET_COLS}
              UPSET_ROWS={UPSET_ROWS}
              PLAYING_COLS={PLAYING_COLS}
              PLAYING_ROWS={PLAYING_ROWS}
            />
          </View>
          {selectedFood && getTotalFood() > 0 && !isTakenByAPS && (
            <Pressable
              onPressIn={() => {
                if (isTakenByAPS) return; // Prevent feeding if APS has Zibu
                setIsSleeping(false); // Stop sleeping if feeding
                isFeedingRef.current = true; // Start eat animation
                setIsFeeding(true); // Trigger re-render for eat animation
                foodUsedRef.current = 0; // Reset food used counter

                // Set the hunger increase rate based on selected food
                const selectedFoodKey =
                  selectedFoodRef.current as keyof typeof inventory;
                const food = FOOD_TYPES[selectedFoodKey];
                selectedFoodHungerIncreaseRef.current =
                  food.hungerRestore / 100;

                // Start feeding interval - consume 1 food per second, increase hunger by appropriate amount per second
                if (!feedIntervalRef.current) {
                  feedIntervalRef.current = setInterval(() => {
                    // Check if the selected food type is available using ref
                    const selectedFoodKey =
                      selectedFoodRef.current as keyof typeof inventory;
                    if (
                      !selectedFoodKey ||
                      !inventoryRef.current ||
                      inventoryRef.current[selectedFoodKey] <= 0
                    ) {
                      // Stop feeding if selected food type is gone
                      if (feedIntervalRef.current) {
                        clearInterval(feedIntervalRef.current);
                        feedIntervalRef.current = null;
                      }
                      isFeedingRef.current = false;
                      setIsFeeding(false);
                      selectedFoodHungerIncreaseRef.current = 0;
                      return;
                    }

                    // Use the selected food type
                    subtractInventoryItem(selectedFoodKey, 1);

                    setNeeds((prev) => {
                      if (!prev) return null;
                      return {
                        ...prev,
                        hunger: Math.min(
                          1,
                          prev.hunger + selectedFoodHungerIncreaseRef.current
                        ),
                      };
                    });

                    foodUsedRef.current += 1; // Track how much food we used
                  }, 1000);
                }
              }}
              onPressOut={() => {
                isFeedingRef.current = false; // Stop eat animation
                setIsFeeding(false); // Trigger re-render for eat animation
                // Stop feeding interval immediately when release
                if (feedIntervalRef.current) {
                  clearInterval(feedIntervalRef.current);
                  feedIntervalRef.current = null;
                }
                foodUsedRef.current = 0; // Reset counter
              }}
              style={StyleSheet.absoluteFill}
            >
              {/* Transparent overlay for feeding */}
            </Pressable>
          )}
        </View>
        {/* Top bar with coin and gear */}
        <View style={styles.topBar}>
          <View>
            <View style={styles.coinLabel}>
              <FontAwesome5
                name="coins"
                size={20}
                color="#F4D35E"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: "#666",
                marginLeft: 2,
                marginTop: 4,
              }}
            >
              Age: {age} day{age !== 1 ? "s" : ""}
            </Text>
          </View>
          <Pressable
            style={styles.gearButton}
            onPress={() => setCoinModalOpen(true)}
          >
            <FontAwesome5 name="cog" size={22} color="#888" />
          </Pressable>
          {/* TEMPORARY: Reset Egg button for testing */}
          <Pressable
            style={{
              marginLeft: 16,
              backgroundColor: "#E94F37",
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 8,
            }}
            onPress={async () => {
              await AsyncStorage.removeItem(HATCH_STORAGE_KEY);
              await AsyncStorage.removeItem("zibu_meteor_intro_seen_v1");
              setIsHatched(false);
              setHatchShakeCount(0);
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
              Reset Egg
            </Text>
          </Pressable>
        </View>
        <Modal
          visible={coinModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setCoinModalOpen(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setCoinModalOpen(false)}
          >
            <View style={styles.gearModalContent}>
              <Text
                style={{ fontWeight: "700", fontSize: 18, marginBottom: 12 }}
              >
                Settings
              </Text>
              <Text style={{ color: "#888", fontSize: 14 }}>
                Coming soon...
              </Text>
            </View>
          </Pressable>
        </Modal>
        <Text style={styles.title}>Zibu</Text>
        <Text style={styles.subtitle}>Your little space buddy</Text>

        <SwatchModal
          visible={sleepSwatchOpen}
          title="Select Blanket"
          items={[
            {
              key: "tattered_blanket",
              label: "Tattered Blanket",
              icon: "dot-circle",
            },
          ]}
          selectedKey={selectedSleepItem}
          onSelect={(key) => {
            setActiveMode("sleep");
            setSelectedSleepItem(key);
            setSelectedFood(null);
            setSelectedCleanTool(null);
            setSelectedToy(null);
            setSleepSwatchOpen(false);
            setIsSleeping(true);
          }}
          onClose={() => setSleepSwatchOpen(false)}
          instructions="Zibu is sleeping... (+1%/sec)"
          selectedActive={isSleeping}
        />

        <SwatchModal
          visible={foodSwatchOpen}
          title="Select Food"
          items={Object.entries(FOOD_TYPES)
            .filter(([key, _]) => inventory[key as keyof typeof inventory] > 0)
            .map(([key, food]) => ({
              key,
              label: food.label,
              icon: food.icon as any,
            }))}
          selectedKey={selectedFood}
          onSelect={(key) => {
            setActiveMode("feed");
            setSelectedFood(key);
            setSelectedCleanTool(null);
            setSelectedToy(null);
            setIsSleeping(false);
            setSelectedSleepItem(null);
            setFoodSwatchOpen(false);
          }}
          onClose={() => setFoodSwatchOpen(false)}
          instructions="Long hold Zibu to feed"
          selectedActive={!!selectedFood}
        />

        <SwatchModal
          visible={cleanSwatchOpen}
          title="Select Cleaner"
          items={[
            { key: "old_sponge", label: "Old Sponge", icon: "dot-circle" },
          ]}
          selectedKey={selectedCleanTool}
          onSelect={(key) => {
            setActiveMode("clean");
            setSelectedCleanTool(key);
            setSelectedFood(null);
            setSelectedToy(null);
            setIsSleeping(false);
            setSelectedSleepItem(null);
            setCleanSwatchOpen(false);
          }}
          onClose={() => setCleanSwatchOpen(false)}
          instructions="Swipe to wash"
          selectedActive={!!selectedCleanTool}
        />

        <SwatchModal
          visible={toySwatchOpen}
          title="Select Toy"
          items={[
            { key: "deflated_ball", label: "Deflated Ball", icon: "futbol" },
          ]}
          selectedKey={selectedToy}
          onSelect={(key) => {
            setActiveMode("play");
            setSelectedToy(key);
            setSelectedFood(null);
            setSelectedCleanTool(null);
            setIsSleeping(false);
            setIsPlaying(true);
            setSelectedSleepItem(null);
            setToySwatchOpen(false);
          }}
          onClose={() => setToySwatchOpen(false)}
          instructions="Shake to play"
          selectedActive={!!selectedToy}
        />
      </View>

      {/* Status icons row (meters) above nav */}
      <View style={styles.statusRow}>
        <Pressable
          onPress={() => {
            if (!inventory.deflated_ball) {
              Alert.alert(
                "No Toy!",
                "You don't have a toy. Buy a Deflated Ball from the shop for 5 coins.",
                [{ text: "OK" }]
              );
              return;
            }
            setActiveMode(null);
            setSelectedFood(null);
            setSelectedCleanTool(null);
            setSelectedToy(null);
            setIsSleeping(false);
            setSelectedSleepItem(null);
            setToySwatchOpen(true);
          }}
          style={[
            { flex: 1, alignItems: "center" },
            activeMode === "play" && styles.selectedActionButton,
          ]}
        >
          <StatusCircle iconName="smile" label="Happy" value={needs.mood} />
        </Pressable>
        <Pressable
          onPress={() => {
            if (getTotalFood() === 0) {
              Alert.alert(
                "No Food!",
                "You don't have any food. Buy some from the shop to feed Zibu.",
                [{ text: "OK" }]
              );
              return;
            }
            setActiveMode(null);
            setSelectedFood(null);
            setSelectedCleanTool(null);
            setSelectedToy(null);
            setIsSleeping(false);
            setSelectedSleepItem(null);
            setFoodSwatchOpen(true);
          }}
          style={[
            { flex: 1, alignItems: "center", justifyContent: "center" },
            activeMode === "feed" && styles.selectedActionButton,
          ]}
        >
          <StatusCircle iconName="utensils" label="Full" value={needs.hunger} />
        </Pressable>
        <Pressable
          onPress={() => {
            if (!inventory.old_sponge) {
              Alert.alert(
                "No Cleaner!",
                "You don't have a cleaner. Buy an Old Sponge from the shop for 5 coins.",
                [{ text: "OK" }]
              );
              return;
            }
            setActiveMode(null);
            setSelectedFood(null);
            setSelectedCleanTool(null);
            setSelectedToy(null);
            setIsSleeping(false);
            setSelectedSleepItem(null);
            setCleanSwatchOpen(true);
          }}
          style={[
            { flex: 1, alignItems: "center" },
            activeMode === "clean" && styles.selectedActionButton,
          ]}
        >
          <StatusCircle iconName="bath" label="Clean" value={needs.clean} />
        </Pressable>
        <Pressable
          onPress={() => {
            if (!inventory.tattered_blanket) {
              Alert.alert(
                "No Blanket!",
                "You don't have a blanket. Buy a Tattered Blanket from the shop for 5 coins.",
                [{ text: "OK" }]
              );
              return;
            }
            setActiveMode(null);
            setSelectedFood(null);
            setSelectedCleanTool(null);
            setSelectedToy(null);
            setIsSleeping(false);
            setSelectedSleepItem(null);
            setSleepSwatchOpen(true);
          }}
          style={[
            { flex: 1, alignItems: "center" },
            activeMode === "sleep" && styles.selectedActionButton,
          ]}
        >
          <StatusCircle iconName="bed" label="Rested" value={needs.rest} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
