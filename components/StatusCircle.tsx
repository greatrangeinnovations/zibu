import React from "react";
import { View, Text } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import styles from "../App.styles";

export type StatusCircleProps = {
  iconName: React.ComponentProps<typeof FontAwesome5>["name"];
  label: string;
  value: number; // 0–1
};

export default function StatusCircle({
  iconName,
  label,
  value,
}: StatusCircleProps) {
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
