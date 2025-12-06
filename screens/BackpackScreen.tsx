import React from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useCoins, FOOD_TYPES } from "../contexts/CoinContext";

const DURABLE_ITEMS = [
  {
    key: "deflated_ball",
    label: "Deflated Ball",
    icon: "futbol",
    description: "Toy - 25 uses",
  },
  {
    key: "old_sponge",
    label: "Old Sponge",
    icon: "bath",
    description: "Cleaner - 25 uses",
  },
  {
    key: "tattered_blanket",
    label: "Tattered Blanket",
    icon: "bed",
    description: "Sleep item - 25 uses",
  },
];

export default function BackpackScreen() {
  const { inventory, coins, getTotalFood, durability } = useCoins();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Backpack</Text>
        <View style={styles.coinRow}>
          <FontAwesome5
            name="coins"
            size={20}
            color="#F4D35E"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Food Section */}
        <Text style={styles.sectionTitle}>Food</Text>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Food</Text>
          <Text style={styles.totalAmount}>{getTotalFood()}</Text>
        </View>

        {Object.entries(FOOD_TYPES).map(([key, food]) => (
          <View key={key} style={styles.itemCard}>
            <FontAwesome5
              name={food.icon as any}
              size={32}
              color="#6DD19C"
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.itemLabel}>{food.label}</Text>
            <Text style={styles.itemAmount}>
              {inventory[key as keyof typeof inventory]}
            </Text>
            <Text style={styles.itemDescription}>
              {food.hungerRestore}% hunger restore
            </Text>
            <Text style={styles.itemPrice}>{food.price} coins</Text>
          </View>
        ))}

        {/* Durable Items Section */}
        <Text style={styles.sectionTitle}>Items</Text>
        {DURABLE_ITEMS.map((item) => (
          <View key={item.key} style={styles.itemCard}>
            <FontAwesome5
              name={item.icon as any}
              size={32}
              color="#FF9999"
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.itemAmount}>
              {inventory[item.key as keyof typeof inventory]}
            </Text>
            <Text style={styles.itemDescription}>{item.description}</Text>
            {inventory[item.key as keyof typeof inventory] > 0 && (
              <View style={styles.durabilityBar}>
                <View
                  style={[
                    styles.durabilityFill,
                    {
                      width: `${
                        (durability[item.key as keyof typeof durability] || 0) *
                        100
                      }%`,
                    },
                  ]}
                />
              </View>
            )}
            {inventory[item.key as keyof typeof inventory] > 0 && (
              <Text style={styles.durabilityText}>
                {Math.round(
                  (durability[item.key as keyof typeof durability] || 0) * 100
                )}
                % durable
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F6F6",
  },
  header: {
    paddingTop: 32,
    paddingBottom: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
  coinRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  coinText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6DD19C",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginTop: 24,
    marginBottom: 12,
    marginLeft: 4,
  },
  totalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 48,
    fontWeight: "700",
    color: "#6DD19C",
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  itemLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  itemAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#6DD19C",
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: "#888",
    marginBottom: 8,
    textAlign: "center",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F4D35E",
  },
  durabilityBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginTop: 8,
    marginBottom: 4,
    overflow: "hidden",
  },
  durabilityFill: {
    height: "100%",
    backgroundColor: "#6DD19C",
    borderRadius: 4,
  },
  durabilityText: {
    fontSize: 11,
    color: "#888",
    fontWeight: "600",
  },
});
