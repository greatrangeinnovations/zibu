import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet } from "react-native";
import { FOOD_TYPES } from "../contexts/CoinContext";
import type { NeedKey } from "../types";

interface Inventory {
  star_milk: number;
  cosmic_fruit: number;
  galaxy_noodle: number;
  deflated_ball: number;
  old_sponge: number;
  tattered_blanket: number;
}

interface FeedingOverlayProps {
  selectedFood: string | null;
  needs: Record<NeedKey, number> | null;
  inventory: Inventory;
  isTakenByAPS: boolean;
  onHungerIncrease: (amount: number) => void;
  onFeedingStateChange: (isFeeding: boolean) => void;
  subtractInventoryItem: (itemId: keyof Inventory, amount: number) => void;
}

export default function FeedingOverlay({
  selectedFood,
  needs,
  inventory,
  isTakenByAPS,
  onHungerIncrease,
  onFeedingStateChange,
  subtractInventoryItem,
}: FeedingOverlayProps) {
  const feedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const selectedFoodHungerIncreaseRef = useRef(0);
  const selectedFoodRef = useRef<string | null>(selectedFood);
  const inventoryRef = useRef(inventory);

  // Keep refs in sync with props
  useEffect(() => {
    selectedFoodRef.current = selectedFood;
  }, [selectedFood]);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  if (!selectedFood || !needs || isTakenByAPS) {
    return null;
  }

  return (
    <Pressable
      onPressIn={() => {
        onFeedingStateChange(true);

        // Set the hunger increase rate based on selected food
        const selectedFoodKey =
          selectedFoodRef.current as keyof typeof inventory;
        const food = FOOD_TYPES[selectedFoodKey];
        selectedFoodHungerIncreaseRef.current = food.hungerRestore / 100;

        // Start feeding interval - consume 1 food per second, increase hunger by appropriate amount per second
        if (!feedIntervalRef.current) {
          feedIntervalRef.current = setInterval(() => {
            // Check if the selected food type is available using ref
            const selectedFoodKey =
              selectedFoodRef.current as keyof typeof inventory;
            if (
              !selectedFoodKey ||
              !inventoryRef.current ||
              inventoryRef.current[selectedFoodKey] <= 0
            ) {
              // Stop feeding if selected food type is gone
              if (feedIntervalRef.current) {
                clearInterval(feedIntervalRef.current);
                feedIntervalRef.current = null;
              }
              onFeedingStateChange(false);
              selectedFoodHungerIncreaseRef.current = 0;
              return;
            }

            // Use the selected food type
            subtractInventoryItem(selectedFoodKey, 1);

            onHungerIncrease(selectedFoodHungerIncreaseRef.current);
          }, 1000);
        }
      }}
      onPressOut={() => {
        onFeedingStateChange(false);
        // Stop feeding interval immediately when release
        if (feedIntervalRef.current) {
          clearInterval(feedIntervalRef.current);
          feedIntervalRef.current = null;
        }
      }}
      style={StyleSheet.absoluteFill}
    >
      {/* Transparent overlay for feeding */}
    </Pressable>
  );
}
