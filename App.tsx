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
import NeedsStatusRow from "./components/NeedsStatusRow";
import FeedingOverlay from "./components/FeedingOverlay";
import APSScreen from "./screens/APSScreen";
import { useCoins, FOOD_TYPES } from "./contexts/CoinContext";
import { OnboardingContext } from "./OnboardingContext";
import { useSwatchModals } from "./hooks/useSwatchModals";
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
    currentCost,
    canRecoverForFree,
    recoveryTimeRemaining,
    apsRecoveryTime,
    recordRescue,
    recordExit,
    resetAPS,
  } = useAPSSystem(needs);

  // Track which action is currently active
  const [activeMode, setActiveMode] = useState<ActiveMode>(null);

  // Swatch modals and selections - managed by custom hook
  const {
    foodSwatchOpen,
    setFoodSwatchOpen,
    selectedFood,
    setSelectedFood,
    onFoodSelect,
    onFoodClose,
    cleanSwatchOpen,
    setCleanSwatchOpen,
    selectedCleanTool,
    setSelectedCleanTool,
    onCleanSelect,
    onCleanClose,
    toySwatchOpen,
    setToySwatchOpen,
    selectedToy,
    setSelectedToy,
    onToySelect,
    onToyClose,
    sleepSwatchOpen,
    setSleepSwatchOpen,
    selectedSleepItem,
    setSelectedSleepItem,
    onSleepSelect,
    onSleepClose,
    resetAllSelections,
  } = useSwatchModals({
    onFoodSelect: () => setActiveMode("feed"),
    onCleanSelect: () => setActiveMode("clean"),
    onToySelect: () => setActiveMode("play"),
    onSleepSelect: () => setActiveMode("sleep"),
    onResetAllSelections: () => setActiveMode(null),
  });

  const selectedFoodRef = useRef<string | null>(null);

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

  // Bubble particles for cleaning effect
  interface Bubble {
    id: number;
    x: number;
    y: number;
    size: number;
    opacity: number;
    vx: number;
    vy: number;
  }
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const bubbleIdRef = useRef(0);

  // Surface area cleaning tracking
  const lastSwipePositionRef = useRef<{ x: number; y: number } | null>(null);
  const accumulatedDistanceRef = useRef(0);
  const SURFACE_AREA_THRESHOLD = 1000; // Distance needed to trigger 1% clean increase

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

  const handlePlayComplete = React.useCallback(() => {
    setIsPlaying(false);
  }, []);

  const playConfig = useMemo(
    () => ({
      fps: PLAYING_FPS,
      frameCount: PLAYING_FRAME_COUNT,
      loop: false,
      onComplete: handlePlayComplete,
    }),
    [handlePlayComplete]
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

  // Bubble animation effect
  useEffect(() => {
    if (!selectedCleanTool || !swipePosition) {
      // Fade out remaining bubbles when cleaning stops
      const fadeTimer = setInterval(() => {
        setBubbles((prev) => {
          const updated = prev
            .map((bubble) => ({
              ...bubble,
              opacity: bubble.opacity - 0.1, // Faster fade (5 frames instead of 20)
            }))
            .filter((bubble) => bubble.opacity > 0);
          if (updated.length === 0) {
            clearInterval(fadeTimer);
          }
          return updated;
        });
      }, 50); // Reduced from 30ms to 50ms (20fps instead of 33fps for fade)
      return () => clearInterval(fadeTimer);
    }

    // Spawn bubble less frequently and in batches
    let spawnCounter = 0;
    const spawnInterval = setInterval(() => {
      spawnCounter++;
      if (spawnCounter >= 3) {
        // Spawn every 3 ticks instead of random
        spawnCounter = 0;
        const newBubble: Bubble = {
          id: bubbleIdRef.current++,
          x: swipePosition.x + (Math.random() - 0.5) * 20,
          y: swipePosition.y + (Math.random() - 0.5) * 20,
          size: Math.random() * 6 + 20,
          opacity: 1,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 1) * 2,
        };
        setBubbles((prev) => [...prev, newBubble]);
      }
    }, 50); // Match animation timer

    // Animate existing bubbles (float up while cleaning) - reduced frequency
    const timer = setInterval(() => {
      setBubbles((prev) => {
        return prev.map((bubble) => ({
          ...bubble,
          x: bubble.x + bubble.vx,
          y: bubble.y + bubble.vy - 0.5, // Float upward
          vy: bubble.vy * 0.98, // Dampen vertical velocity
        }));
      });
    }, 50); // Reduced from 30ms to 50ms (20fps instead of 33fps)

    return () => {
      clearInterval(timer);
      clearInterval(spawnInterval);
    };
  }, [selectedCleanTool, swipePosition]);

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
        // Update sponge visual position
        if (isCleaningRef.current) {
          const currentPos = {
            x: gestureState.moveX,
            y: gestureState.moveY,
          };
          setSwipePosition(currentPos);

          // Calculate distance traveled for surface area coverage
          if (
            lastSwipePositionRef.current &&
            inventoryRef.current.old_sponge > 0
          ) {
            const dx = currentPos.x - lastSwipePositionRef.current.x;
            const dy = currentPos.y - lastSwipePositionRef.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            accumulatedDistanceRef.current += distance;

            // Every SURFACE_AREA_THRESHOLD pixels covered, increase clean by 1%
            if (accumulatedDistanceRef.current >= SURFACE_AREA_THRESHOLD) {
              const cleanIncreases = Math.floor(
                accumulatedDistanceRef.current / SURFACE_AREA_THRESHOLD
              );
              accumulatedDistanceRef.current %= SURFACE_AREA_THRESHOLD;

              // Use sponge durability proportional to cleaning
              useDurableItemRef.current("old_sponge", 0.01 * cleanIncreases);

              setNeeds((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  clean: Math.min(1, prev.clean + 0.01 * cleanIncreases),
                };
              });
            }
          }

          lastSwipePositionRef.current = currentPos;
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Clear swipe position and reset tracking when gesture ends
        setSwipePosition(null);
        lastSwipePositionRef.current = null;
        accumulatedDistanceRef.current = 0;
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
    const handleRecoverWithCoins = async () => {
      if (coins >= currentCost) {
        subtractCoins(currentCost);

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
          `You need ${currentCost} coins to help Zibu recover right now!`
        );
      }
    };

    const handleWaitForRecovery = async () => {
      // Reset needs to 50% but don't record another infraction
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

      // Record the recovery time so we don't increment strikes again
      await recordRescue();
      recordExit();
      setIsTakenByAPS(false);
    };

    return (
      <APSScreen
        coins={coins}
        currentCost={currentCost}
        apsInfractions={apsInfractions}
        canRecoverForFree={canRecoverForFree}
        recoveryTimeRemaining={recoveryTimeRemaining}
        onRecoverWithCoins={handleRecoverWithCoins}
        onWaitForRecovery={handleWaitForRecovery}
      />
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
        <NeedsStatusRow
          needs={needs}
          inventory={inventory}
          getTotalFood={getTotalFood}
          activeMode={activeMode}
          onPlaySelected={() => {
            resetAllSelections();
            setSelectedToy(null);
            setIsSleeping(false);
            setToySwatchOpen(true);
          }}
          onFeedSelected={() => {
            resetAllSelections();
            setSelectedFood(null);
            setFoodSwatchOpen(true);
          }}
          onCleanSelected={() => {
            resetAllSelections();
            setSelectedCleanTool(null);
            setCleanSwatchOpen(true);
          }}
          onSleepSelected={() => {
            resetAllSelections();
            setSelectedSleepItem(null);
            setSleepSwatchOpen(true);
          }}
          selectedActionButtonStyle={styles.selectedActionButton}
        />

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
                dirtiness={needs ? 1 - needs.clean : 0}
              />
            </View>
            <FeedingOverlay
              selectedFood={selectedFood}
              needs={needs}
              inventory={inventory}
              isTakenByAPS={isTakenByAPS}
              onHungerIncrease={(amount) => {
                setNeeds((prev) => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    hunger: Math.min(1, prev.hunger + amount),
                  };
                });
              }}
              onFeedingStateChange={(isFeeding) => {
                setIsFeeding(isFeeding);
                if (isFeeding) {
                  isFeedingRef.current = true;
                  setIsSleeping(false);
                  foodUsedRef.current = 0;
                } else {
                  isFeedingRef.current = false;
                  foodUsedRef.current = 0;
                }
              }}
              subtractInventoryItem={subtractInventoryItem}
            />

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

            {/* Bubble particles during cleaning */}
            {bubbles.map((bubble) => (
              <View
                key={bubble.id}
                style={{
                  position: "absolute",
                  left: bubble.x - 80 - bubble.size / 2,
                  top: bubble.y - 400 - bubble.size / 2,
                  width: bubble.size,
                  height: bubble.size,
                  borderRadius: bubble.size / 2,
                  backgroundColor: `rgba(200, 220, 255, ${
                    bubble.opacity * 0.6
                  })`,
                  borderWidth: 1,
                  borderColor: `rgba(100, 180, 255, ${bubble.opacity * 0.8})`,
                  pointerEvents: "none",
                  opacity: bubble.opacity,
                }}
              />
            ))}
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
              onSleepSelect(key);
              setSelectedSleepItem(key);
              setIsSleeping(true);
            }}
            onClose={onSleepClose}
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
            onSelect={onFoodSelect}
            onClose={onFoodClose}
            instructions="Long hold Zibu to feed"
            selectedActive={!!selectedFood}
          />

          <SwatchModal
            visible={cleanSwatchOpen}
            title="Select Cleaner"
            items={[{ key: "old_sponge", label: "Old Sponge", Icon: Eraser }]}
            selectedKey={selectedCleanTool}
            onSelect={onCleanSelect}
            onClose={onCleanClose}
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
              onToySelect(key);
              setSelectedToy(key);
              setIsPlaying(true);
            }}
            onClose={onToyClose}
            instructions="Shake to play"
            selectedActive={!!selectedToy}
          />
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}
