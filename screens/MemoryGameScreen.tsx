import React, { useState, useEffect } from "react";
import { useCoins } from "../contexts/CoinContext";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";

const SYMBOLS = [
  "star",
  "moon",
  "sun",
  "cloud",
  "bolt",
  "atom",
  "star",
  "moon",
  "sun",
  "cloud",
  "bolt",
  "atom",
];

function shuffle(array: string[]) {
  let arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function MemoryGameScreen({ navigation }: any) {
  const { coins, addCoins } = useCoins();
  const [tiles, setTiles] = useState<string[]>(() => shuffle(SYMBOLS));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [canFlip, setCanFlip] = useState(true);
  const [gameWon, setGameWon] = useState(false);

  useEffect(() => {
    if (flipped.length === 2) {
      setCanFlip(false);
      setTimeout(() => {
        const [i, j] = flipped;
        if (tiles[i] === tiles[j]) {
          setMatched((prev) => [...prev, i, j]);
        }
        setFlipped([]);
        setCanFlip(true);
      }, 800);
    }
  }, [flipped, tiles]);

  useEffect(() => {
    if (!gameWon && matched.length === tiles.length && tiles.length > 0) {
      setGameWon(true);
      setTimeout(() => {
        addCoins(1);
        Alert.alert("You win!", "You found all pairs and earned 1 coin!", [
          { text: "Play Again", onPress: resetGame },
          { text: "Back", onPress: () => navigation.goBack() },
        ]);
      }, 500);
    }
  }, [matched, tiles, navigation, addCoins, gameWon]);

  const resetGame = () => {
    setTiles(shuffle(SYMBOLS));
    setFlipped([]);
    setMatched([]);
    setGameWon(false);
  };

  const handleFlip = (idx: number) => {
    if (!canFlip || flipped.includes(idx) || matched.includes(idx)) return;
    if (flipped.length === 2) return;
    setFlipped((prev) => [...prev, idx]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Memory Game</Text>
        <View style={styles.coinRow}>
          <FontAwesome5
            name="coins"
            size={20}
            color="#F4D35E"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.coinText}>{coins}</Text>
        </View>
      </View>
      <FlatList
        data={tiles}
        numColumns={4}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={styles.grid}
        renderItem={({ item, index }) => {
          const isFaceUp = flipped.includes(index) || matched.includes(index);
          return (
            <Pressable
              style={[styles.tile, isFaceUp && styles.tileUp]}
              onPress={() => handleFlip(index)}
              disabled={isFaceUp || !canFlip}
            >
              {isFaceUp ? (
                <FontAwesome5 name={item as any} size={32} color="#6DD19C" />
              ) : (
                <View style={styles.tileBack} />
              )}
            </Pressable>
          );
        }}
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
  grid: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tile: {
    width: 64,
    height: 64,
    margin: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tileUp: {
    backgroundColor: "#eafff3",
  },
  tileBack: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#bbb",
  },
});
