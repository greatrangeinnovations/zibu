import React, { useState } from "react";
import { useCoins, FOOD_TYPES } from "../contexts/CoinContext";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";

const SHOP_ITEMS = [
  { key: "toy", label: "Toy", price: 250, icon: "futbol" },
  { key: "blanket", label: "Blanket", price: 400, icon: "bed" },
  { key: "sponge", label: "Sponge", price: 150, icon: "bath" },
];

export default function ShopScreen() {
  const { coins, subtractCoins, addInventoryItem, inventory } = useCoins();
  const [purchased, setPurchased] = useState<{ [key: string]: boolean }>({});

  const handleFoodPurchase = (
    foodId: "star_milk" | "cosmic_fruit" | "galaxy_noodle",
    food: (typeof FOOD_TYPES)[keyof typeof FOOD_TYPES]
  ) => {
    const totalCost = food.price;
    if (coins < totalCost) {
      Alert.alert(
        "Not enough coins",
        `You need ${totalCost} coins but only have ${coins}.`
      );
      return;
    }
    subtractCoins(totalCost);
    addInventoryItem(foodId, 1);
    Alert.alert(
      "Purchased!",
      `You bought ${food.label} for ${totalCost} coins!`
    );
  };

  const handlePurchase = (item: (typeof SHOP_ITEMS)[0]) => {
    if (coins < item.price) {
      Alert.alert(
        "Not enough coins",
        "You don't have enough coins to buy this item."
      );
      return;
    }

    if (purchased[item.key]) {
      Alert.alert("Already owned", "You already own this item.");
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
      <ScrollView contentContainerStyle={styles.list}>
        {/* Food items section */}
        <Text style={styles.sectionTitle}>Food</Text>
        {Object.entries(FOOD_TYPES).map(([foodId, food]) => (
          <View key={foodId} style={styles.foodCard}>
            <View style={styles.foodHeader}>
              <FontAwesome5
                name={food.icon as any}
                size={28}
                color="#6DD19C"
                style={{ marginRight: 16 }}
              />
              <View style={styles.foodInfo}>
                <Text style={styles.itemLabel}>{food.label}</Text>
                <Text style={styles.itemSubtitle}>
                  +{food.hungerRestore}% hunger
                </Text>
              </View>
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.itemPrice}>{food.price} coins</Text>
              <Pressable
                style={[
                  styles.buyButton,
                  coins < food.price && styles.buyButtonDisabled,
                ]}
                onPress={() => handleFoodPurchase(foodId as any, food)}
                disabled={coins < food.price}
              >
                <Text style={styles.buyButtonText}>Buy</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {/* Other items section */}
        <Text style={styles.sectionTitle} onPress={() => {}}>
          Items
        </Text>
        {SHOP_ITEMS.map((item) => (
          <View key={item.key} style={styles.itemRow}>
            <FontAwesome5
              name={item.icon as any}
              size={28}
              color="#6DD19C"
              style={{ marginRight: 16 }}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemLabel}>{item.label}</Text>
            </View>
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
  list: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
    marginBottom: 12,
    marginLeft: 4,
  },
  foodCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  foodHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  foodInfo: {
    flex: 1,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 0,
  },
  itemLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  itemSubtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F4D35E",
    marginRight: 12,
  },
  buyButton: {
    backgroundColor: "#6DD19C",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buyButtonDisabled: {
    backgroundColor: "#bbb",
  },
  buyButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
