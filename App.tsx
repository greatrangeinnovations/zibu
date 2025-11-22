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

type NeedKey = "mood" | "hunger" | "clean" | "rest";

const DECAY_PER_TICK = 0.02; // how much to lose each tick (0.02 = 2%)
const TICK_MS = 5000; // how often to decay, in ms (5000 = 5 seconds)

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

  // Update cleaning ref when tool selection changes
  useEffect(() => {
    isCleaningRef.current = selectedCleanTool !== null;
  }, [selectedCleanTool]);

  // Update playing ref when toy selection changes
  useEffect(() => {
    isPlayingRef.current = selectedToy !== null;
  }, [selectedToy]);

  // Accelerometer listener for shake detection
  useEffect(() => {
    let subscription: any;

    const setupAccelerometer = async () => {
      await Accelerometer.setUpdateInterval(50);
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        const acceleration = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();

        if (
          acceleration > shakeThresholdRef.current &&
          isPlayingRef.current &&
          now - lastShakeRef.current > 500
        ) {
          lastShakeRef.current = now;
          setNeeds((prev) => ({
            ...prev,
            mood: Math.min(1, prev.mood + 0.15),
          }));
          console.log(
            "Shake detected! Mood increased. Acceleration:",
            acceleration
          );
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
          <Image
            source={require("./assets/zibu.png")}
            style={styles.zibuImage}
            resizeMode="contain"
          />
          {selectedFood && (
            <Pressable
              onLongPress={() => {
                setNeeds((prev) => ({
                  ...prev,
                  hunger: Math.min(1, prev.hunger + 0.2),
                }));
                setSelectedFood(null);
              }}
              delayLongPress={350}
              style={StyleSheet.absoluteFill}
            >
              {/* Transparent overlay for feeding */}
            </Pressable>
          )}
        </View>
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
    backgroundColor: "#F6F6FF",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  zibuImage: {
    width: 220,
    height: 220,
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
    marginBottom: 60,
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
});
