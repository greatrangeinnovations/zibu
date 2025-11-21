import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
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
        <Image
          source={require("./assets/zibu.png")}
          style={styles.zibuImage}
          resizeMode="contain"
        />
        <Text style={styles.title}>Zibu</Text>
        <Text style={styles.subtitle}>Your little space buddy</Text>

        {/* Status icons row */}
        <View style={styles.statusRow}>
          <StatusCircle iconName="smile" label="Happy" value={needs.mood} />
          <StatusCircle iconName="utensils" label="Full" value={needs.hunger} />
          <StatusCircle iconName="bath" label="Clean" value={needs.clean} />
          <StatusCircle iconName="bed" label="Rested" value={needs.rest} />
        </View>

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

  return (
    <View style={styles.statusItem}>
      <View style={styles.iconWrapper}>
        {/* Background circle */}
        <View style={styles.iconCircle}>
          {/* Green fill that drains from bottom to top */}
          <View style={styles.iconFillContainer}>
            <View style={[styles.iconFill, { height: `${percent}%` }]} />
          </View>

          {/* Icon on top */}
          <View style={styles.iconContent}>
            <FontAwesome5 name={iconName} size={24} color="#333" />
          </View>

          {/* Percentage badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{percent}%</Text>
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
  },
  iconFill: {
    backgroundColor: "#6DD19C",
    opacity: 0.75,
    borderRadius: 32,
  },
  iconContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    top: 4,
    right: 4,
    backgroundColor: "#2E7D32",
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
});
