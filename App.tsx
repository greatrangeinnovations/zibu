import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  Pressable,
  Modal,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

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
        <Pressable
          onLongPress={() => {
            if (selectedFood) {
              setNeeds((prev) => ({
                ...prev,
                hunger: Math.min(1, prev.hunger + 0.2),
              }));
              setSelectedFood(null);
            }
          }}
          delayLongPress={350}
        >
          <Image
            source={require("./assets/zibu.png")}
            style={styles.zibuImage}
            resizeMode="contain"
          />
        </Pressable>
        <Text style={styles.title}>Zibu</Text>
        <Text style={styles.subtitle}>Your little space buddy</Text>

        {/* Status icons row */}
        <View style={styles.statusRow}>
          <StatusCircle iconName="smile" label="Happy" value={needs.mood} />
          <Pressable
            onLongPress={() => setFoodSwatchOpen(true)}
            delayLongPress={350}
            style={{ flex: 1, alignItems: "center" }}
          >
            <StatusCircle
              iconName="utensils"
              label="Full"
              value={needs.hunger}
            />
          </Pressable>
          <StatusCircle iconName="bath" label="Clean" value={needs.clean} />
          <StatusCircle iconName="bed" label="Rested" value={needs.rest} />
        </View>

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

        <Text style={styles.helperText}>
          These will slowly drain over time. Next step: filling them back up
          with hold-to-feed, swipe-to-wash, and shake-to-play.
        </Text>
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
  container: {
    flex: 1,
    backgroundColor: "#F6F6FF",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: 40,
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
    marginTop: 32,
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
