import React from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useCoins, FOOD_TYPES } from "../contexts/CoinContext";

export default function BackpackScreen() {
  const { inventory, coins, getTotalFood } = useCoins();

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
});
