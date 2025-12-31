import React, { useEffect, useRef, useState, useContext, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  Modal,
  PanResponder,
  Alert,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import {
  Coins,
  Rocket,
  Settings,
  Skull,
  Smile,
  Utensils,
  Bath,
  Bed,
  Milk,
  Salad,
  Soup,
  Volleyball,
  Eraser,
  StickyNote,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import styles from "./App.styles";
import StatusCircle from "./components/StatusCircle";
import SwatchModal from "./components/SwatchModal";
import ZibuSprite from "./components/ZibuSprite";
import { useCoins, FOOD_TYPES } from "./contexts/CoinContext";
import { OnboardingContext } from "./OnboardingContext";
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
import {
  useZibuNeeds,
  useAnimationFrame,
  useAccelerometer,
  useAPSSystem,
  useBlinkAnimation,
} from "./hooks";
import type { NeedKey } from "./types";

type ActiveMode = "feed" | "clean" | "play" | "sleep" | null;

const HATCH_SHAKE_TARGET = 20; // Number of shakes required to hatch
const HATCH_STORAGE_KEY = "zibu_hatched_v1";
const AGE_STORAGE_KEY = "zibu_age_v1"; // Timestamp when hatched

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const onboardingContext = useContext(OnboardingContext);
  const {
    coins,
    inventory,
    subtractInventoryItem,
    getTotalFood,
    subtractCoins,
    durability,
    useDurableItem,
  } = useCoins();

  // Needs state - managed by custom hook
  const { needs, setNeeds, isInitialized } = useZibuNeeds(
    onboardingContext?.resetCounter
  );

  // APS state - managed by custom hook
  const {
    isTakenByAPS,
    setIsTakenByAPS,
    apsInfractions,
    isPermanentLoss,
    currentCost,
    recordRescue,
    recordExit,
    resetAPS,
  } = useAPSSystem(needs);

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
  const [isUpset, setIsUpset] = useState(false);

  // Swipe tracking for sponge visual
  const [swipePosition, setSwipePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Animation frames - using custom hooks
  const frame = useBlinkAnimation(); // Complex blink pattern: single, wait, double, wait, repeat

  // Memoize animation configs to prevent unnecessary re-renders
  const sleepConfig = useMemo(
    () => ({
      fps: SLEEP_FPS,
      frameCount: SLEEP_FRAME_COUNT,
      loop: false,
    }),
    []
  );

  const playConfig = useMemo(
    () => ({
      fps: PLAYING_FPS,
      frameCount: PLAYING_FRAME_COUNT,
      loop: false,
      onComplete: () => setIsPlaying(false),
    }),
    [setIsPlaying]
  );

  const eatConfig = useMemo(
    () => ({
      fps: EAT_FPS,
      frameCount: EAT_FRAME_COUNT,
      loop: true,
    }),
    []
  );

  const upsetConfig = useMemo(
    () => ({
      fps: UPSET_FPS,
      frameCount: UPSET_FRAME_COUNT,
      loop: false,
    }),
    []
  );

  const sleepFrame = useAnimationFrame(isSleeping, sleepConfig);
  const playFrame = useAnimationFrame(isPlaying, playConfig);
  const eatFrame = useAnimationFrame(isFeeding, eatConfig);
  const upsetFrame = useAnimationFrame(isUpset, upsetConfig);

  // Hatching state
  const [isHatched, setIsHatched] = useState<boolean | null>(null);
  const [hatchShakeCount, setHatchShakeCount] = useState(0);
  const [hatchTime, setHatchTime] = useState<number | null>(null);
  const [age, setAge] = useState(0);

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
  const useDurableItemRef = useRef(useDurableItem);
  const inventoryRef = useRef(inventory);
  const durabilityRef = useRef(durability);
  const contentViewRef = useRef<View>(null);
  const [contentLayout, setContentLayout] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isCleaningRef.current,
      onMoveShouldSetPanResponder: () => isCleaningRef.current,
      onPanResponderMove: (evt, gestureState) => {
        // Update swipe position to show sponge following the swipe
        if (isCleaningRef.current) {
          setSwipePosition({
            x: gestureState.moveX,
            y: gestureState.moveY,
          });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Clear swipe position when gesture ends
        setSwipePosition(null);

        // Detect horizontal swipe (distance > 20px)
        if (
          Math.abs(gestureState.dx) > 20 &&
          isCleaningRef.current &&
          inventoryRef.current.old_sponge > 0
        ) {
          // Use 4% of the sponge's durability per swipe (25 swipes to destroy)
          useDurableItemRef.current("old_sponge", 0.04);
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

  // Initialize: load hatching state from storage
  useEffect(() => {
    const initialize = async () => {
      try {
        // Load hatching state
        const hatchedRaw = await AsyncStorage.getItem(HATCH_STORAGE_KEY);
        setIsHatched(hatchedRaw === "true");

        // Load age
        const ageRaw = await AsyncStorage.getItem(AGE_STORAGE_KEY);
        if (ageRaw) {
          const hatchedAt = parseInt(ageRaw, 10);
          setHatchTime(hatchedAt);
          const ageInMs = Date.now() - hatchedAt;
          const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
          setAge(ageInDays);
        }
      } catch (e) {
        console.warn("Failed to initialize hatching state", e);
        setIsHatched(false);
      }
    };
    initialize();
  }, [onboardingContext?.resetCounter]);

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
    if (needs === null) return;

    const saveState = async () => {
      const data = {
        needs,
        lastUpdated: Date.now(),
      };
      try {
        await AsyncStorage.setItem("zibu_needs_v1", JSON.stringify(data));
      } catch (e) {
        console.warn("Failed to save needs", e);
      }
    };

    saveState();
  }, [needs]);

  // Update cleaning ref when tool selection changes
  useEffect(() => {
    isCleaningRef.current = selectedCleanTool !== null;
  }, [selectedCleanTool]);

  // Stop cleaning if sponge runs out
  useEffect(() => {
    if (inventory.old_sponge === 0 && selectedCleanTool !== null) {
      setSelectedCleanTool(null);
      isCleaningRef.current = false;
    }
  }, [inventory.old_sponge, selectedCleanTool]);

  // Keep selectedFoodRef in sync with state
  useEffect(() => {
    selectedFoodRef.current = selectedFood;
  }, [selectedFood]);

  // Keep inventoryRef in sync with context
  useEffect(() => {
    inventoryRef.current = inventory;
    durabilityRef.current = durability;
    useDurableItemRef.current = useDurableItem;
  }, [inventory, durability, useDurableItem]);

  // Update playing ref when toy selection changes
  useEffect(() => {
    isPlayingRef.current = selectedToy !== null;
    if (!selectedToy) {
      setIsShaking(false);
      setIsPlaying(false);
    }
  }, [selectedToy]);

  // Stop playing if toy runs out
  useEffect(() => {
    if (inventory.deflated_ball === 0 && selectedToy !== null) {
      setSelectedToy(null);
      setIsShaking(false);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  }, [inventory.deflated_ball, selectedToy]);

  // Use accelerometer hook for hatching and play
  const lastAccelShakeTime = useRef<number>(0);
  const accelShakeTimeout = useRef<NodeJS.Timeout | null>(null);

  useAccelerometer(
    isHatched !== null, // Enable when we know hatching status
    {
      onShake: (now) => {
        // Hatching screen: count shakes
        if (isHatched === false) {
          setHatchShakeCount((count) => {
            const next = count + 1;
            if (next >= HATCH_SHAKE_TARGET) {
              setIsHatched(true);
              const now = Date.now();
              setHatchTime(now);
              setAge(0);
              AsyncStorage.setItem(HATCH_STORAGE_KEY, "true");
              AsyncStorage.setItem(AGE_STORAGE_KEY, now.toString());
            }
            return next;
          });
        }

        // Main app play logic
        if (
          isHatched &&
          isPlayingRef.current &&
          inventoryRef.current.deflated_ball > 0 &&
          now - lastAccelShakeTime.current > 500
        ) {
          lastAccelShakeTime.current = now;
          // Use 4% of the toy's durability per shake (25 shakes to destroy)
          useDurableItemRef.current("deflated_ball", 0.04);
          setNeeds((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              mood: Math.min(1, prev.mood + 0.01),
            };
          });
          setIsShaking(true);
          if (accelShakeTimeout.current)
            clearTimeout(accelShakeTimeout.current);
          setIsPlaying(true);
          accelShakeTimeout.current = setTimeout(() => {
            setIsShaking(false);
          }, 600);
        }
      },
    },
    500 // debounceMs
  );

  // Sleep effect: increase rested by 1% per second when sleeping
  useEffect(() => {
    if (!isSleeping) return;
    const interval = setInterval(() => {
      // Stop sleeping if blanket runs out
      if (inventoryRef.current.tattered_blanket <= 0) {
        setIsSleeping(false);
        return;
      }
      // Use 4% of blanket's durability per second of sleep (25 seconds = 100%)
      useDurableItemRef.current("tattered_blanket", 0.04);
      setNeeds((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          rest: Math.min(1, prev.rest + 0.01),
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSleeping]);

  // Stop sleeping if blanket runs out
  useEffect(() => {
    if (inventory.tattered_blanket === 0 && isSleeping) {
      setIsSleeping(false);
    }
  }, [inventory.tattered_blanket, isSleeping]);

  // Monitor needs to detect if meter is critical
  useEffect(() => {
    if (!needs) return;
    const anyMeterCritical = Object.values(needs).some((value) => value < 0.1);

    if (anyMeterCritical && !hasPlayedUpsetRef.current) {
      setIsUpset(true);
      hasPlayedUpsetRef.current = true;
    } else if (!anyMeterCritical && hasPlayedUpsetRef.current) {
      hasPlayedUpsetRef.current = false;
      setIsUpset(false);
    }
  }, [needs]);

  // Monitor needs to detect if meter is critical
  useEffect(() => {
    if (!needs) return;
    const anyMeterCritical = Object.values(needs).some((value) => value < 0.1);

    if (anyMeterCritical && !hasPlayedUpsetRef.current) {
      setIsUpset(true);
      hasPlayedUpsetRef.current = true;
    } else if (!anyMeterCritical && hasPlayedUpsetRef.current) {
      hasPlayedUpsetRef.current = false;
      setIsUpset(false);
    }
  }, [needs]);

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

  if (isTakenByAPS) {
    // APS taken Zibu screen - with escalating costs and permanent loss on 3rd infraction
    const currentInfraction = apsInfractions + 1; // Next infraction number
    const rescueCost = currentCost; // From the hook

    const handleRescueZibu = async () => {
      if (isPermanentLoss) return; // Cannot rescue on permanent loss

      if (coins >= rescueCost) {
        subtractCoins(rescueCost);

        // Reset needs to 50%
        const rescuedNeeds = {
          mood: 0.5,
          hunger: 0.5,
          clean: 0.5,
          rest: 0.5,
        };

        // SAVE TO STORAGE FIRST
        await AsyncStorage.setItem(
          "zibu_needs_v1",
          JSON.stringify({
            needs: rescuedNeeds,
            lastUpdated: Date.now(),
          })
        );

        // Update state
        setNeeds(rescuedNeeds);
        await recordRescue();
        recordExit();
        setIsTakenByAPS(false);
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
      await AsyncStorage.removeItem("zibu_needs_v1");
      // Also clear the meteor intro so user sees intro screen again
      await AsyncStorage.removeItem("zibu_meteor_intro_seen_v1");
      await resetAPS();

      // Reset local state
      setIsHatched(null);
      setHatchShakeCount(0);
      setHatchTime(null);
      setAge(0);
      setIsTakenByAPS(false);
      setNeeds(null);

      // Use the onboarding context to reset to intro screen
      if (onboardingContext?.resetOnboarding) {
        await onboardingContext.resetOnboarding();
      }
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
              <Skull size={80} color="#FF3333" style={{ marginBottom: 20 }} />
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
              <Rocket size={80} color="#FF6B6B" style={{ marginBottom: 20 }} />
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
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" />
      {/* Top bar with coin and age */}
      <View style={styles.topBar}>
        <View>
          <View style={styles.coinLabel}>
            <Coins size={20} color="#F4D35E" style={{ marginRight: 6 }} />
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
          <Settings size={22} color="#888" />
        </Pressable>
      </View>

      {/* Background with Zibu and interactions */}
      <ImageBackground
        source={require("./assets/bathroom.png")}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        {/* Status icons row (meters) - overlaying background at top */}
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
            <StatusCircle Icon={Smile} label="Happy" value={needs.mood} />
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
            <StatusCircle Icon={Utensils} label="Full" value={needs.hunger} />
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
            <StatusCircle Icon={Bath} label="Clean" value={needs.clean} />
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
            <StatusCircle Icon={Bed} label="Rested" value={needs.rest} />
          </Pressable>
        </View>

        {/* Content with Zibu inside background */}
        <View
          style={styles.content}
          ref={contentViewRef}
          onLayout={(event) => {
            const { x, y } = event.nativeEvent.layout;
            setContentLayout({ x, y });
          }}
        >
          <View {...panResponder.panHandlers}>
            <View
              style={{
                width: DISPLAY_SIZE,
                height: DISPLAY_SIZE,
                overflow: "hidden",
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
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

            {/* Sponge icon that follows the swipe during washing */}
            {selectedCleanTool && swipePosition && (
              <View
                style={{
                  position: "absolute",
                  left: swipePosition.x - 80,
                  top: swipePosition.y - 400,
                  width: 40,
                  height: 40,
                  justifyContent: "center",
                  alignItems: "center",
                  pointerEvents: "none",
                }}
              >
                <Eraser size={32} color="#E8A87C" />
              </View>
            )}
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
                <Text style={{ color: "#888", fontSize: 14, marginBottom: 16 }}>
                  Coming soon...
                </Text>
                <Pressable
                  style={{
                    backgroundColor: "#FFB6C1",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                  onPress={async () => {
                    setNeeds({ mood: 0, hunger: 0, clean: 0, rest: 0 });
                    await AsyncStorage.setItem(
                      "needs",
                      JSON.stringify({ mood: 0, hunger: 0, clean: 0, rest: 0 })
                    );
                    await AsyncStorage.setItem(
                      "lastUpdated",
                      JSON.stringify(Date.now())
                    );
                  }}
                >
                  <Text
                    style={{ color: "#333", fontWeight: "700", fontSize: 12 }}
                  >
                    Dev: Set All Needs to 0
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Modal>

          <SwatchModal
            visible={sleepSwatchOpen}
            title="Select Blanket"
            items={[
              {
                key: "tattered_blanket",
                label: "Tattered Blanket",
                Icon: StickyNote,
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
              .filter(
                ([key, _]) => inventory[key as keyof typeof inventory] > 0
              )
              .map(([key, food]) => {
                let Icon = Milk;
                if (key === "star_milk") Icon = Milk;
                else if (key === "cosmic_fruit") Icon = Salad;
                else if (key === "galaxy_noodle") Icon = Soup;
                return {
                  key,
                  label: food.label,
                  Icon,
                };
              })}
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
            items={[{ key: "old_sponge", label: "Old Sponge", Icon: Eraser }]}
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
              {
                key: "deflated_ball",
                label: "Deflated Ball",
                Icon: Volleyball,
              },
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
      </ImageBackground>
    </SafeAreaView>
  );
}
