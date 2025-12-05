import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useCoins } from "../contexts/CoinContext";

export default function BackpackScreen() {
  const { food, coins } = useCoins();

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

      <View style={styles.content}>
        <View style={styles.itemCard}>
          <FontAwesome5
            name="utensils"
            size={48}
            color="#6DD19C"
            style={{ marginBottom: 16 }}
          />
          <Text style={styles.itemLabel}>Food</Text>
          <Text style={styles.itemAmount}>{food}</Text>
          <Text style={styles.itemDescription}>
            Each food provides 1 hunger point
          </Text>
        </View>
      </View>
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
    flex: 1,
    padding: 24,
    justifyContent: "flex-start",
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  itemLabel: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  itemAmount: {
    fontSize: 48,
    fontWeight: "700",
    color: "#6DD19C",
    marginBottom: 12,
  },
  itemDescription: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
