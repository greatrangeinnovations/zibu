import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  Pressable,
  Modal,
  PanResponder,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { Accelerometer } from "expo-sensors";
import { Image as ExpoImage } from "expo-image";

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

type NeedKey = "mood" | "hunger" | "clean" | "rest";

const DECAY_PER_TICK = 0.01; // how much to lose each tick (0.01 = 1%)
const TICK_MS = 10000; // how often to decay, in ms (10000 = 10 seconds)

export default function App() {
  const [needs, setNeeds] = useState<Record<NeedKey, number>>({
    mood: 1,
    hunger: 1,
    clean: 1,
    rest: 1,
  });
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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isCleaningRef.current,
      onMoveShouldSetPanResponder: () => isCleaningRef.current,
      onPanResponderRelease: (evt, gestureState) => {
        // Detect horizontal swipe (distance > 20px)
        if (Math.abs(gestureState.dx) > 20 && isCleaningRef.current) {
          setNeeds((prev) => ({
            ...prev,
            clean: Math.min(1, prev.clean + 0.01),
          }));
        }
      },
    })
  ).current;

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
          acceleration > 3 &&
          isPlayingRef.current &&
          now - lastShakeRef.current > 500
        ) {
          lastShakeRef.current = now;
          setNeeds((prev) => ({
            ...prev,
            mood: Math.min(1, prev.mood + 0.01),
          }));
        }
      });
    };

    setupAccelerometer();

    return () => {
      subscription?.remove();
    };
  }, []);

  // Sleep effect: increase rested by 1% per second when sleeping
  useEffect(() => {
    if (!isSleeping) return;
    const interval = setInterval(() => {
      setNeeds((prev) => ({
        ...prev,
        rest: Math.min(1, prev.rest + 0.01),
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [isSleeping]);

  // Slowly decrease each need over time
  useEffect(() => {
    const interval = setInterval(() => {
      setNeeds((prev) => {
        const next: Record<NeedKey, number> = { ...prev };
        (Object.keys(next) as NeedKey[]).forEach((key) => {
          next[key] = Math.max(0, next[key] - DECAY_PER_TICK);
        });
        return next;
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, []);

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
            {isSleeping ? (
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
                // Start feeding interval - increase by 1% per second while holding
                if (!feedIntervalRef.current) {
                  feedIntervalRef.current = setInterval(() => {
                    setNeeds((prev) => ({
                      ...prev,
                      hunger: Math.min(1, prev.hunger + 0.01),
                    }));
                  }, 1000);
                }
              }}
              onPressOut={() => {
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
          onLongPress={() => setToySwatchOpen(true)}
          delayLongPress={350}
          style={{ flex: 1, alignItems: "center" }}
        >
          <StatusCircle iconName="smile" label="Happy" value={needs.mood} />
        </Pressable>
        <Pressable
          onLongPress={() => setFoodSwatchOpen(true)}
          delayLongPress={350}
          style={{ flex: 1, alignItems: "center" }}
        >
          <StatusCircle iconName="utensils" label="Full" value={needs.hunger} />
        </Pressable>
        <Pressable
          onLongPress={() => setCleanSwatchOpen(true)}
          delayLongPress={350}
          style={{ flex: 1, alignItems: "center" }}
        >
          <StatusCircle iconName="bath" label="Clean" value={needs.clean} />
        </Pressable>
        <Pressable
          onLongPress={() => setSleepSwatchOpen(true)}
          delayLongPress={350}
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

type StatusCircleProps = {
  iconName: React.ComponentProps<typeof FontAwesome5>["name"];
  label: string;
  value: number; // 0–1
};

function StatusCircle({ iconName, label, value }: StatusCircleProps) {
  const percent = Math.round(value * 100);

  // Determine fill color based on value
  let fillColor = "#6DD19C"; // green
  if (value >= 0.75) {
    fillColor = "#6DD19C"; // green
  } else if (value >= 0.5) {
    fillColor = "#F4D35E"; // yellow
  } else if (value >= 0.25) {
    fillColor = "#FFA552"; // orange
  } else {
    fillColor = "#E94F37"; // red
  }

  return (
    <View style={styles.statusItem}>
      <View style={styles.iconWrapper}>
        {/* Badge moved outside of iconCircle to avoid clipping */}
        <View style={[styles.badge, { backgroundColor: fillColor }]}>
          <Text style={styles.badgeText}>{percent}%</Text>
        </View>
        {/* Background circle */}
        <View style={styles.iconCircle}>
          {/* Icon on top, with a little opacity so color shows through */}
          <View style={styles.iconContent}>
            <FontAwesome5
              name={iconName}
              size={24}
              color="#333"
              style={{ opacity: 0.85 }}
            />
          </View>
          {/* Color fill overlays the icon, color based on value */}
          <View style={styles.iconFillContainer} pointerEvents="none">
            <View
              style={[
                styles.iconFill,
                { height: `${percent}%`, backgroundColor: fillColor },
              ]}
            />
          </View>
        </View>
      </View>
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 0,
    paddingTop: 10, // Adjusted to align with the very top
    paddingBottom: 2,
    backgroundColor: "transparent",
    zIndex: 10,
    position: "absolute", // Ensure it stays at the top
    top: 0, // Position at the very top
    width: "100%", // Span the entire width
  },
  coinLabel: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  coinText: {
    fontWeight: "700",
    color: "#333",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  gearButton: {
    padding: 8,
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  gearModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    minWidth: 220,
    shadowColor: "#000",
    shadowOpacity: 0.13,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    opacity: 1,
    paddingVertical: 4,
  },
  navItemDisabled: {
    opacity: 0.5,
  },
  navLabel: {
    fontSize: 12,
    color: "#bbb",
    marginTop: 2,
  },
  container: {
    flex: 1,
    backgroundColor: "#F6F6F6",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end", // Move Zibu lower for better vertical centering
    paddingHorizontal: 24,
    paddingBottom: 60, // Add more space below
  },
  zibuImage: {
    width: 300, // Slightly bigger
    height: 300, // Slightly bigger
  },
  title: {
    marginTop: 16,
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    color: "#666",
  },
  statusRow: {
    marginBottom: 100,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusItem: {
    alignItems: "center",
    flex: 1,
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative", // So badge can be absolutely positioned
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E2E6FF",
    overflow: "hidden",
    position: "relative",
  },
  iconFillContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    width: "100%",
    height: "100%",
  },
  iconFill: {
    // backgroundColor set dynamically
    opacity: 0.6,
    width: "100%",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    // No borderRadius for straight edge
  },
  iconContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  statusLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#555",
  },
  helperText: {
    marginTop: 32,
    fontSize: 13,
    color: "#888",
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    top: -8, // Move above the circle
    right: -8, // Move to the right edge
    backgroundColor: "#2E7D32",
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 26,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2, // Ensure it's above the circle
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  swatchOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  swatchContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    minWidth: 180,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  swatchTitle: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 16,
    color: "#333",
  },
  swatchItem: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 4,
  },
  swatchItemSelected: {
    backgroundColor: "#6DD19C",
  },
  swatchItemLabel: {
    fontSize: 13,
    marginTop: 8,
    color: "#333",
    fontWeight: "500",
  },
  feedInstructions: {
    fontSize: 11,
    color: "#888",
    marginTop: 12,
    fontStyle: "italic",
  },
  tooltip: {
    position: "absolute",
    bottom: 10, // Adjust to position above meters
    alignItems: "center",
    transform: [{ translateX: -50 }],
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 6,
    borderRadius: 6,
    zIndex: 20,
  },
  tooltipText: {
    color: "#fff",
    fontSize: 9,
    textAlign: "center",
  },
  tooltipArrow: {
    position: "absolute",
    bottom: -6, // Position below the tooltip box
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(0, 0, 0, 0.8)",
  },
});
