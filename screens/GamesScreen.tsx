import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useCoins } from "../contexts/CoinContext";

export default function GamesScreen({ navigation }: any) {
  const { coins } = useCoins();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Games</Text>
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

      <ScrollView
        style={styles.gamesContainer}
        contentContainerStyle={styles.gamesContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.gameCard}
          onPress={() => navigation.navigate("MemoryGame")}
        >
          <FontAwesome5 name="brain" size={48} color="#6DD19C" />
          <Text style={styles.gameName}>Memory Game</Text>
          <Text style={styles.gameDesc}>Match pairs of symbols</Text>
        </Pressable>

        <Pressable
          style={styles.gameCard}
          onPress={() => navigation.navigate("SequenceGame")}
        >
          <FontAwesome5 name="stream" size={48} color="#6DD19C" />
          <Text style={styles.gameName}>Sequence</Text>
          <Text style={styles.gameDesc}>Memorize the sequence</Text>
        </Pressable>

        <Pressable
          style={styles.gameCard}
          onPress={() => navigation.navigate("SpaceGame")}
        >
          <FontAwesome5 name="rocket" size={48} color="#6DD19C" />
          <Text style={styles.gameName}>Space Defense</Text>
          <Text style={styles.gameDesc}>Survive and destroy enemies</Text>
        </Pressable>

        <Pressable
          style={styles.gameCard}
          onPress={() => navigation.navigate("TiltMaze")}
        >
          <FontAwesome5 name="circle" size={48} color="#6DD19C" />
          <Text style={styles.gameName}>Tilt Maze</Text>
          <Text style={styles.gameDesc}>Roll the orb through the maze</Text>
        </Pressable>
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
  gamesContainer: {
    flex: 1,
  },
  gamesContent: {
    padding: 24,
    gap: 24,
    paddingBottom: 32,
  },
  gameCard: {
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
  gameName: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 16,
    color: "#333",
  },
  gameDesc: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
});
