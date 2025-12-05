import React, { useState } from "react";
import { useCoins } from "../contexts/CoinContext";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";

const SHOP_ITEMS = [
  { key: "food", label: "Food", price: 100, icon: "utensils" },
  { key: "toy", label: "Toy", price: 250, icon: "futbol" },
  { key: "blanket", label: "Blanket", price: 400, icon: "bed" },
  { key: "sponge", label: "Sponge", price: 150, icon: "bath" },
];

export default function ShopScreen() {
  const { coins, subtractCoins } = useCoins();
  const [purchased, setPurchased] = useState<{ [key: string]: boolean }>({});

  const handlePurchase = (item: (typeof SHOP_ITEMS)[0]) => {
    if (coins < item.price) {
      Alert.alert(
        "Not enough coins",
        "You don't have enough coins to buy this item."
      );
      return;
    }
    subtractCoins(item.price);
    setPurchased((prev) => ({ ...prev, [item.key]: true }));
    Alert.alert("Purchased!", `You bought a ${item.label}.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shop</Text>
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
      <FlatList
        data={SHOP_ITEMS}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <FontAwesome5
              name={item.icon as any}
              size={28}
              color="#6DD19C"
              style={{ marginRight: 16 }}
            />
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.itemPrice}>{item.price} coins</Text>
            <Pressable
              style={[
                styles.buyButton,
                (coins < item.price || purchased[item.key]) &&
                  styles.buyButtonDisabled,
              ]}
              onPress={() => handlePurchase(item)}
              disabled={coins < item.price || purchased[item.key]}
            >
              <Text style={styles.buyButtonText}>
                {purchased[item.key] ? "Owned" : "Buy"}
              </Text>
            </Pressable>
          </View>
        )}
      />
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
  list: {
    padding: 24,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemLabel: {
    flex: 1,
    fontSize: 18,
    fontWeight: "500",
  },
  itemPrice: {
    fontSize: 16,
    color: "#888",
    marginRight: 16,
  },
  buyButton: {
    backgroundColor: "#6DD19C",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buyButtonDisabled: {
    backgroundColor: "#bbb",
  },
  buyButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
