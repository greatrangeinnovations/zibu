import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  Modal,
  PanResponder,
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
import {
  FRAME_COUNT,
  COLS,
  ROWS,
  DISPLAY_SIZE,
  FPS,
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

export default function HomeScreen() {
  // Needs state
  const [needs, setNeeds] = useState<Record<NeedKey, number> | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Track which action is currently active
  const [activeMode, setActiveMode] = useState<ActiveMode>(null);

  // Swatch modals and selections
  const [foodSwatchOpen, setFoodSwatchOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<string | null>(null);

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
  const [isSleeping, setIsSleeping] = useState(false);
  const [isFeeding, setIsFeeding] = useState(false);

  // Animation frames
  const [frame, setFrame] = useState(0);
  const [sleepFrame, setSleepFrame] = useState(0);
  const [eatFrame, setEatFrame] = useState(0);
  const [upsetFrame, setUpsetFrame] = useState(0);

  // Upset state
  const [isUpset, setIsUpset] = useState(false);

  // Coin modal and coins
  const [coinModalOpen, setCoinModalOpen] = useState(false);
  const [coins, setCoins] = useState(1250);

  // Refs for effects and gesture state
  const isCleaningRef = useRef(false);
  const isPlayingRef = useRef(false);
  const isFeedingRef = useRef(false);
  const lastShakeRef = useRef<number>(0);
  const feedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasPlayedUpsetRef = useRef(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isCleaningRef.current,
      onMoveShouldSetPanResponder: () => isCleaningRef.current,
      onPanResponderRelease: (evt, gestureState) => {
        // Detect horizontal swipe (distance > 20px)
        if (Math.abs(gestureState.dx) > 20 && isCleaningRef.current) {
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

  // Initialize: load needs from storage and apply offline decay
  useEffect(() => {
    const initializeNeeds = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          // Load stored needs
          const saved: StoredNeeds = JSON.parse(raw);
          const now = Date.now();
          const elapsedMs = now - saved.lastUpdated;

          if (elapsedMs > 0) {
            // Apply offline decay
            const decayPerMs = getDecayPerMs(DECAY_PER_TICK, TICK_MS);
            setNeeds(applyDecay(saved.needs, decayPerMs, elapsedMs));
          } else {
            setNeeds(saved.needs);
          }
        } else {
          // First time: use defaults
          setNeeds({
            mood: 0.5,
            hunger: 0.04,
            clean: 0.5,
            rest: 0.1,
          });
        }
      } catch (e) {
        console.warn("Failed to initialize needs", e);
        // Fallback to defaults
        setNeeds({
          mood: 0.5,
          hunger: 0.04,
          clean: 0.5,
          rest: 0.1,
        });
      } finally {
        setIsInitialized(true);
      }
    };

    initializeNeeds();
  }, []);

  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      const prevState = appState.current;
      appState.current = nextState;

      // Going to background/inactive: save needs and timestamp
      if (
        prevState === "active" &&
        (nextState === "inactive" || nextState === "background")
      ) {
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
      // Came back to foreground: apply offline decay
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

  // Update playing ref when toy selection changes
  useEffect(() => {
    isPlayingRef.current = selectedToy !== null;

    // Add a timeout to check if it stays the same
    setTimeout(() => {}, 1000);
  }, [selectedToy]);

  // Accelerometer listener for shake detection
  useEffect(() => {
    let subscription: any;

    const setupAccelerometer = async () => {
      await Accelerometer.setUpdateInterval(100);
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        const acceleration = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();

        if (
          acceleration > 2 &&
          isPlayingRef.current &&
          now - lastShakeRef.current > 500
        ) {
          lastShakeRef.current = now;
          setNeeds((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              mood: Math.min(1, prev.mood + 0.01),
            };
          });
        }
      });
    };

    setupAccelerometer();

    applyOfflineDecay();

    return () => {
      subscription?.remove();
    };
  }, []);

  // Sleep effect: increase rested by 1% per second when sleeping
  useEffect(() => {
    if (!isSleeping) return;
    const interval = setInterval(() => {
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
    const interval = setInterval(() => {
      setNeeds((prev) => {
        if (!prev) return null;
        const next: Record<NeedKey, number> = { ...prev };
        (Object.keys(next) as NeedKey[]).forEach((key) => {
          next[key] = Math.max(0, next[key] - DECAY_PER_TICK);
        });
        return next;
      });
    }, TICK_MS);

    return () => clearInterval(interval);
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

  if (!isInitialized || needs === null) {
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
              isUpset={isUpset}
              isSleeping={isSleeping}
              isFeeding={isFeeding}
              frame={frame}
              sleepFrame={sleepFrame}
              eatFrame={eatFrame}
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
            />
          </View>
          {selectedFood && (
            <Pressable
              onPressIn={() => {
                setIsSleeping(false); // Stop sleeping if feeding
                isFeedingRef.current = true; // Start eat animation
                setIsFeeding(true); // Trigger re-render for eat animation
                // Start feeding interval - increase by 1% per second while holding
                if (!feedIntervalRef.current) {
                  feedIntervalRef.current = setInterval(() => {
                    setNeeds((prev) => {
                      if (!prev) return null;
                      return {
                        ...prev,
                        hunger: Math.min(1, prev.hunger + 0.01),
                      };
                    });
                  }, 1000);
                }
              }}
              onPressOut={() => {
                isFeedingRef.current = false; // Stop eat animation
                setIsFeeding(false); // Trigger re-render for eat animation
                // Stop feeding interval when release
                if (feedIntervalRef.current) {
                  clearInterval(feedIntervalRef.current);
                  feedIntervalRef.current = null;
                }
              }}
              style={StyleSheet.absoluteFill}
            >
              {/* Transparent overlay for feeding */}
            </Pressable>
          )}
        </View>
        {/* Top bar with coin and gear */}
        <View style={styles.topBar}>
          <View style={styles.coinLabel}>
            <FontAwesome5
              name="coins"
              size={20}
              color="#F4D35E"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
          </View>
          <Pressable
            style={styles.gearButton}
            onPress={() => setCoinModalOpen(true)}
          >
            <FontAwesome5 name="cog" size={22} color="#888" />
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
          items={[{ key: "blanket", label: "Old Blanket", icon: "dot-circle" }]}
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
          items={[{ key: "bottle", label: "Bottle", icon: "wine-bottle" }]}
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
          items={[{ key: "sponge", label: "Old Sponge", icon: "dot-circle" }]}
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
          items={[{ key: "ball", label: "Deflated Ball", icon: "circle" }]}
          selectedKey={selectedToy}
          onSelect={(key) => {
            setActiveMode("play");
            setSelectedToy(key);
            setSelectedFood(null);
            setSelectedCleanTool(null);
            setIsSleeping(false);
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
            setActiveMode(null);
            setSelectedFood(null);
            setSelectedCleanTool(null);
            setSelectedToy(null);
            setIsSleeping(false);
            setSelectedSleepItem(null);
            setFoodSwatchOpen(true);
          }}
          style={[
            { flex: 1, alignItems: "center" },
            activeMode === "feed" && styles.selectedActionButton,
          ]}
        >
          <StatusCircle iconName="utensils" label="Full" value={needs.hunger} />
        </Pressable>
        <Pressable
          onPress={() => {
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
