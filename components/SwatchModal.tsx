import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import styles from "../App.styles";

export type SwatchItem = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof FontAwesome5>["name"];
};

export type SwatchModalProps = {
  visible: boolean;
  title: string;
  items: SwatchItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onClose: () => void;
  instructions?: string;
  selectedActive?: boolean;
};

export default function SwatchModal({
  visible,
  title,
  items,
  selectedKey,
  onSelect,
  onClose,
  instructions,
  selectedActive,
}: SwatchModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.swatchOverlay} onPress={onClose}>
        <Pressable style={styles.swatchContainer} onPress={() => {}}>
          <Text style={styles.swatchTitle}>{title}</Text>
          {items.map((item) => (
            <Pressable
              key={item.key}
              style={[
                styles.swatchItem,
                selectedKey === item.key && styles.swatchItemSelected,
              ]}
              onPress={() => onSelect(item.key)}
            >
              <FontAwesome5
                name={item.icon}
                size={32}
                color={selectedKey === item.key ? "#fff" : "#6DD19C"}
              />
              <Text
                style={[
                  styles.swatchItemLabel,
                  selectedKey === item.key && { color: "#fff" },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
          {selectedKey && selectedActive && instructions && (
            <Text style={styles.feedInstructions}>{instructions}</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
