import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  Modal,
  PanResponder,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { Accelerometer } from "expo-sensors";
import { Image as ExpoImage } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import styles from "./App.styles";
import StatusCircle from "./components/StatusCircle";

const STORAGE_KEY = "zibu_needs_v1";

type StoredNeeds = {
  needs: Record<NeedKey, number>;
  lastUpdated: number;
};

// Blink animation
const FRAME_COUNT = 8;
const COLS = 3; // 3 columns
const ROWS = 3; // 3 rows
const DISPLAY_SIZE = 300; // Display at 300x300
const FPS = 20; // Frame rate

// Sleep animation
const SLEEP_FRAME_COUNT = 3;
const SLEEP_COLS = 3; // 3 columns
const SLEEP_ROWS = 1; // 1 row
const SLEEP_FPS = 15;

// Eat animation
const EAT_FRAME_COUNT = 4;
const EAT_COLS = 4; // 4 columns
const EAT_ROWS = 1; // 1 row
const EAT_FPS = 15;

// Upset animation
const UPSET_FRAME_COUNT = 5;
const UPSET_COLS = 5; // 5 columns
const UPSET_ROWS = 1; // 1 row
const UPSET_FPS = 15;

type NeedKey = "mood" | "hunger" | "clean" | "rest";

const DECAY_PER_TICK = 0.01; // how much to lose each tick (0.01 = 1%)
const TICK_MS = 300000; // how often to decay, in ms

export default function App() {
  const [needs, setNeeds] = useState<Record<NeedKey, number> | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
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
  const [isSleeping, setIsSleeping] = useState(false);
  const isCleaningRef = useRef(false);
  const isPlayingRef = useRef(false);
  const lastShakeRef = useRef<number>(0);
  const shakeThresholdRef = useRef(35);
  const feedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [coinModalOpen, setCoinModalOpen] = useState(false);
  const [coins, setCoins] = useState(1250);
  const [frame, setFrame] = useState(0);
  const [sleepFrame, setSleepFrame] = useState(0);
  const [eatFrame, setEatFrame] = useState(0);
  const isFeedingRef = useRef(false);
  const [isFeeding, setIsFeeding] = useState(false);
  const [upsetFrame, setUpsetFrame] = useState(0);
  const [isUpset, setIsUpset] = useState(false);
  const hasPlayedUpsetRef = useRef(false);
  const appState = useRef(AppState.currentState);

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
            const decayPerMs = DECAY_PER_TICK / TICK_MS;
            const decayAmount = elapsedMs * decayPerMs;

            const nextNeeds: Record<NeedKey, number> = { ...saved.needs };
            (Object.keys(nextNeeds) as NeedKey[]).forEach((key) => {
              nextNeeds[key] = Math.max(0, nextNeeds[key] - decayAmount);
            });
            setNeeds(nextNeeds);
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
    const sub = AppState.addEventListener("change", (nextState) => {
      // Came back to foreground
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        applyOfflineDecay();
      }

      appState.current = nextState;
    });

    return () => sub.remove();
  }, []);

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
    if (needs === null) return; // Not initialized yet

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved: StoredNeeds = JSON.parse(raw);
      const now = Date.now();
      const elapsedMs = now - saved.lastUpdated;

      if (elapsedMs <= 0) return;

      const decayPerMs = DECAY_PER_TICK / TICK_MS; // same rate as in the interval
      const decayAmount = elapsedMs * decayPerMs;

      const nextNeeds: Record<NeedKey, number> = { ...saved.needs };
      (Object.keys(nextNeeds) as NeedKey[]).forEach((key) => {
        nextNeeds[key] = Math.max(0, nextNeeds[key] - decayAmount);
      });

      setNeeds(nextNeeds);
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
            {isUpset ? (
              // Upset spritesheet
              <ExpoImage
                source={require("./assets/upset/upset_spritesheet.png")}
                style={{
                  width: DISPLAY_SIZE * UPSET_COLS,
                  height: DISPLAY_SIZE * UPSET_ROWS,
                  marginLeft: -((upsetFrame % UPSET_COLS) * DISPLAY_SIZE),
                  marginTop: -(
                    Math.floor(upsetFrame / UPSET_COLS) * DISPLAY_SIZE
                  ),
                }}
                contentFit="cover"
                cachePolicy="memory"
              />
            ) : isSleeping ? (
              // Sleep spritesheet
              <ExpoImage
                source={require("./assets/sleep/sleep_spritesheet.png")}
                style={{
                  width: DISPLAY_SIZE * SLEEP_COLS,
                  height: DISPLAY_SIZE * SLEEP_ROWS,
                  marginLeft: -((sleepFrame % SLEEP_COLS) * DISPLAY_SIZE),
                  marginTop: -(
                    Math.floor(sleepFrame / SLEEP_COLS) * DISPLAY_SIZE
                  ),
                }}
                contentFit="cover"
                cachePolicy="memory"
              />
            ) : isFeeding ? (
              // Eat spritesheet
              <ExpoImage
                source={require("./assets/eat/eat_spritesheet.png")}
                style={{
                  width: DISPLAY_SIZE * EAT_COLS,
                  height: DISPLAY_SIZE * EAT_ROWS,
                  marginLeft: -((eatFrame % EAT_COLS) * DISPLAY_SIZE),
                  marginTop: -(Math.floor(eatFrame / EAT_COLS) * DISPLAY_SIZE),
                }}
                contentFit="cover"
                cachePolicy="memory"
              />
            ) : (
              // Blink spritesheet
              <ExpoImage
                source={require("./assets/happy-blink/blink_spritesheet.png")}
                style={{
                  width: DISPLAY_SIZE * COLS,
                  height: DISPLAY_SIZE * ROWS,
                  marginLeft: -((frame % COLS) * DISPLAY_SIZE),
                  marginTop: -(Math.floor(frame / COLS) * DISPLAY_SIZE),
                }}
                contentFit="cover"
                cachePolicy="memory"
              />
            )}
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

        {/* Sleep swatch modal */}
        <Modal
          visible={sleepSwatchOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setSleepSwatchOpen(false)}
        >
          <Pressable
            style={styles.swatchOverlay}
            onPress={() => setSleepSwatchOpen(false)}
          >
            <Pressable style={styles.swatchContainer} onPress={() => {}}>
              <Text style={styles.swatchTitle}>Select Blanket</Text>
              <Pressable
                style={[
                  styles.swatchItem,
                  selectedSleepItem === "blanket" && styles.swatchItemSelected,
                ]}
                onPress={() => {
                  setSelectedSleepItem("blanket");
                  setSleepSwatchOpen(false);
                  setIsSleeping(true);
                }}
              >
                <FontAwesome5
                  name="dot-circle"
                  size={32}
                  color={selectedSleepItem === "blanket" ? "#fff" : "#6DD19C"}
                />
                <Text
                  style={[
                    styles.swatchItemLabel,
                    selectedSleepItem === "blanket" && { color: "#fff" },
                  ]}
                >
                  Old Blanket
                </Text>
              </Pressable>
              {selectedSleepItem && isSleeping && (
                <Text style={styles.feedInstructions}>
                  Zibu is sleeping... (+1%/sec)
                </Text>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Food swatch modal */}
        <Modal
          visible={foodSwatchOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setFoodSwatchOpen(false)}
        >
          <Pressable
            style={styles.swatchOverlay}
            onPress={() => setFoodSwatchOpen(false)}
          >
            <Pressable style={styles.swatchContainer} onPress={() => {}}>
              <Text style={styles.swatchTitle}>Select Food</Text>
              <Pressable
                style={[
                  styles.swatchItem,
                  selectedFood === "bottle" && styles.swatchItemSelected,
                ]}
                onPress={() => {
                  setSelectedFood("bottle");
                  setFoodSwatchOpen(false);
                }}
              >
                <FontAwesome5
                  name="wine-bottle"
                  size={32}
                  color={selectedFood === "bottle" ? "#fff" : "#6DD19C"}
                />
                <Text
                  style={[
                    styles.swatchItemLabel,
                    selectedFood === "bottle" && { color: "#fff" },
                  ]}
                >
                  Bottle
                </Text>
              </Pressable>
              {selectedFood && (
                <Text style={styles.feedInstructions}>
                  Long hold Zibu to feed
                </Text>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Clean swatch modal */}
        <Modal
          visible={cleanSwatchOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setCleanSwatchOpen(false)}
        >
          <Pressable
            style={styles.swatchOverlay}
            onPress={() => setCleanSwatchOpen(false)}
          >
            <Pressable style={styles.swatchContainer} onPress={() => {}}>
              <Text style={styles.swatchTitle}>Select Cleaner</Text>
              <Pressable
                style={[
                  styles.swatchItem,
                  selectedCleanTool === "sponge" && styles.swatchItemSelected,
                ]}
                onPress={() => {
                  setSelectedCleanTool("sponge");
                  setIsSleeping(false); // Stop sleeping if cleaning
                  setCleanSwatchOpen(false);
                }}
              >
                <FontAwesome5
                  name="dot-circle"
                  size={32}
                  color={selectedCleanTool === "sponge" ? "#fff" : "#6DD19C"}
                />
                <Text
                  style={[
                    styles.swatchItemLabel,
                    selectedCleanTool === "sponge" && {
                      color: "#fff",
                    },
                  ]}
                >
                  Old Sponge
                </Text>
              </Pressable>
              {selectedCleanTool && (
                <Text style={styles.feedInstructions}>Swipe to wash</Text>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Toy swatch modal */}
        <Modal
          visible={toySwatchOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setToySwatchOpen(false)}
        >
          <Pressable
            style={styles.swatchOverlay}
            onPress={() => setToySwatchOpen(false)}
          >
            <Pressable style={styles.swatchContainer} onPress={() => {}}>
              <Text style={styles.swatchTitle}>Select Toy</Text>
              <Pressable
                style={[
                  styles.swatchItem,
                  selectedToy === "ball" && styles.swatchItemSelected,
                ]}
                onPress={() => {
                  setSelectedToy("ball");
                  setIsSleeping(false); // Stop sleeping if playing
                  setToySwatchOpen(false);
                }}
              >
                <FontAwesome5
                  name="circle"
                  size={32}
                  color={selectedToy === "ball" ? "#fff" : "#6DD19C"}
                />
                <Text
                  style={[
                    styles.swatchItemLabel,
                    selectedToy === "ball" && { color: "#fff" },
                  ]}
                >
                  Deflated Ball
                </Text>
              </Pressable>
              {selectedToy && (
                <Text style={styles.feedInstructions}>Shake to play</Text>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Add hints for interactions based on need levels */}
        {needs.hunger < 0.7 && (
          <View style={[styles.tooltip, { left: "43%" }]}>
            <Text style={styles.tooltipText}>Tap and hold to feed</Text>
            <View style={styles.tooltipArrow} />
          </View>
        )}
        {needs.mood < 0.7 && (
          <View style={[styles.tooltip, { left: "19%" }]}>
            <Text style={styles.tooltipText}>Shake to play</Text>
            <View style={styles.tooltipArrow} />
          </View>
        )}
        {needs.clean < 0.7 && (
          <View style={[styles.tooltip, { left: "75%" }]}>
            <Text style={styles.tooltipText}>Swipe to wash</Text>
            <View style={styles.tooltipArrow} />
          </View>
        )}
        {needs.rest < 0.7 && (
          <View style={[styles.tooltip, { left: "105%" }]}>
            <Text style={styles.tooltipText}>Put to sleep</Text>
            <View style={styles.tooltipArrow} />
          </View>
        )}
      </View>

      {/* Status icons row (meters) above nav */}
      <View style={styles.statusRow}>
        <Pressable
          onPress={() => setToySwatchOpen(true)}
          style={{ flex: 1, alignItems: "center" }}
        >
          <StatusCircle iconName="smile" label="Happy" value={needs.mood} />
        </Pressable>
        <Pressable
          onPress={() => setFoodSwatchOpen(true)}
          style={{ flex: 1, alignItems: "center" }}
        >
          <StatusCircle iconName="utensils" label="Full" value={needs.hunger} />
        </Pressable>
        <Pressable
          onPress={() => setCleanSwatchOpen(true)}
          style={{ flex: 1, alignItems: "center" }}
        >
          <StatusCircle iconName="bath" label="Clean" value={needs.clean} />
        </Pressable>
        <Pressable
          onPress={() => setSleepSwatchOpen(true)}
          style={{ flex: 1, alignItems: "center" }}
        >
          <StatusCircle iconName="bed" label="Rested" value={needs.rest} />
        </Pressable>
      </View>

      {/* Bottom navigation menu */}
      <View style={styles.bottomNav}>
        <Pressable style={styles.navItem}>
          <FontAwesome5 name="home" size={24} color="#6DD19C" />
          <Text
            style={[styles.navLabel, { color: "#6DD19C", fontWeight: "700" }]}
          >
            Home
          </Text>
        </Pressable>
        <Pressable style={[styles.navItem, styles.navItemDisabled]} disabled>
          <FontAwesome5 name="shopping-bag" size={24} color="#bbb" />
          <Text style={styles.navLabel}>Shop</Text>
        </Pressable>
        <Pressable style={[styles.navItem, styles.navItemDisabled]} disabled>
          <FontAwesome5 name="history" size={24} color="#bbb" />
          <Text style={styles.navLabel}>History</Text>
        </Pressable>
        <Pressable style={[styles.navItem, styles.navItemDisabled]} disabled>
          <FontAwesome5 name="user" size={24} color="#bbb" />
          <Text style={styles.navLabel}>Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
