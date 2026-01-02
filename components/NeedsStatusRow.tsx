import React from "react";
import { View, Pressable, Alert, StyleSheet } from "react-native";
import { Smile, Utensils, Bath, Bed } from "lucide-react-native";
import StatusCircle from "./StatusCircle";
import type { NeedKey } from "../types";

interface Inventory {
  star_milk: number;
  cosmic_fruit: number;
  galaxy_noodle: number;
  deflated_ball: number;
  old_sponge: number;
  tattered_blanket: number;
}

interface NeedsStatusRowProps {
  needs: Record<NeedKey, number>;
  inventory: Inventory;
  getTotalFood: () => number;
  activeMode: "feed" | "clean" | "play" | "sleep" | null;
  onPlaySelected: () => void;
  onFeedSelected: () => void;
  onCleanSelected: () => void;
  onSleepSelected: () => void;
  selectedActionButtonStyle: any;
}

const NeedButton = ({
  onPress,
  isActive,
  Icon,
  label,
  value,
  selectedActionButtonStyle,
}: {
  onPress: () => void;
  isActive: boolean;
  Icon: any;
  label: string;
  value: number;
  selectedActionButtonStyle: any;
}) => (
  <Pressable
    onPress={onPress}
    style={[
      { flex: 1, alignItems: "center", justifyContent: "center" },
      isActive && selectedActionButtonStyle,
    ]}
  >
    <StatusCircle Icon={Icon} label={label} value={value} />
  </Pressable>
);

export default function NeedsStatusRow({
  needs,
  inventory,
  getTotalFood,
  activeMode,
  onPlaySelected,
  onFeedSelected,
  onCleanSelected,
  onSleepSelected,
  selectedActionButtonStyle,
}: NeedsStatusRowProps) {
  return (
    <View style={styles.statusRow}>
      <NeedButton
        onPress={() => {
          if (!inventory.deflated_ball) {
            Alert.alert(
              "No Toy!",
              "You don't have a toy. Buy a Deflated Ball from the shop for 5 coins.",
              [{ text: "OK" }]
            );
            return;
          }
          onPlaySelected();
        }}
        isActive={activeMode === "play"}
        Icon={Smile}
        label="Happy"
        value={needs.mood}
        selectedActionButtonStyle={selectedActionButtonStyle}
      />
      <NeedButton
        onPress={() => {
          if (getTotalFood() === 0) {
            Alert.alert(
              "No Food!",
              "You don't have any food. Buy some from the shop to feed Zibu.",
              [{ text: "OK" }]
            );
            return;
          }
          onFeedSelected();
        }}
        isActive={activeMode === "feed"}
        Icon={Utensils}
        label="Full"
        value={needs.hunger}
        selectedActionButtonStyle={selectedActionButtonStyle}
      />
      <NeedButton
        onPress={() => {
          if (!inventory.old_sponge) {
            Alert.alert(
              "No Cleaner!",
              "You don't have a cleaner. Buy an Old Sponge from the shop for 5 coins.",
              [{ text: "OK" }]
            );
            return;
          }
          onCleanSelected();
        }}
        isActive={activeMode === "clean"}
        Icon={Bath}
        label="Clean"
        value={needs.clean}
        selectedActionButtonStyle={selectedActionButtonStyle}
      />
      <NeedButton
        onPress={() => {
          if (!inventory.tattered_blanket) {
            Alert.alert(
              "No Blanket!",
              "You don't have a blanket. Buy a Tattered Blanket from the shop for 5 coins.",
              [{ text: "OK" }]
            );
            return;
          }
          onSleepSelected();
        }}
        isActive={activeMode === "sleep"}
        Icon={Bed}
        label="Rested"
        value={needs.rest}
        selectedActionButtonStyle={selectedActionButtonStyle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
});
