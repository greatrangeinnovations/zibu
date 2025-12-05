import React, { useState } from "react";
import { useCoins } from "../contexts/CoinContext";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import Slider from "@react-native-community/slider";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";

const SHOP_ITEMS = [
  { key: "food", label: "Food", price: 1, icon: "utensils" },
  { key: "toy", label: "Toy", price: 250, icon: "futbol" },
  { key: "blanket", label: "Blanket", price: 400, icon: "bed" },
  { key: "sponge", label: "Sponge", price: 150, icon: "bath" },
];

export default function ShopScreen() {
  const { coins, subtractCoins, food, addFood } = useCoins();
  const [purchased, setPurchased] = useState<{ [key: string]: boolean }>({});
  const [foodQuantity, setFoodQuantity] = useState(1);

  const handlePurchase = (item: (typeof SHOP_ITEMS)[0]) => {
    // Handle food purchase with slider quantity
    if (item.key === "food") {
      const totalCost = item.price * foodQuantity;
      if (coins < totalCost) {
        Alert.alert(
          "Not enough coins",
          `You need ${totalCost} coins but only have ${coins}.`
        );
        return;
      }
      subtractCoins(totalCost);
      addFood(foodQuantity); // Each coin = 1 food point
      Alert.alert(
        "Purchased!",
        `You bought ${foodQuantity} food for ${totalCost} coins!`
      );
      setFoodQuantity(1); // Reset slider
      return;
    }

    // Handle other items (one-time purchases)
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
        {/* Food item with slider */}
        <View style={styles.foodCard}>
          <View style={styles.foodHeader}>
            <FontAwesome5
              name="utensils"
              size={28}
              color="#6DD19C"
              style={{ marginRight: 16 }}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemLabel}>Food</Text>
              <Text style={styles.itemSubtitle}>
                {foodQuantity} hunger points
              </Text>
            </View>
          </View>

          <View style={styles.sliderContainer}>
            <Text style={styles.quantityLabel}>Quantity: {foodQuantity}</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={100}
              value={foodQuantity}
              onValueChange={(value: number) =>
                setFoodQuantity(Math.round(value))
              }
              step={1}
              minimumTrackTintColor="#6DD19C"
              maximumTrackTintColor="#ddd"
              thumbTintColor="#6DD19C"
            />
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.totalPrice}>Total: {foodQuantity} coins</Text>
            <Pressable
              style={[
                styles.buyButton,
                coins < foodQuantity && styles.buyButtonDisabled,
              ]}
              onPress={() => handlePurchase(SHOP_ITEMS[0])}
              disabled={coins < foodQuantity}
            >
              <Text style={styles.buyButtonText}>Buy</Text>
            </Pressable>
          </View>
        </View>

        {/* Other items */}
        {SHOP_ITEMS.slice(1).map((item) => (
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
    padding: 24,
  },
  foodCard: {
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
  foodHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    padding: 18,
    marginBottom: 18,
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
    fontWeight: "500",
  },
  itemSubtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
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
