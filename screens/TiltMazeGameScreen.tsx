import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Alert,
  Dimensions,
  ScrollView,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { Accelerometer } from "expo-sensors";
import { useCoins } from "../contexts/CoinContext";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const GAME_AREA_WIDTH = SCREEN_WIDTH - 32;
const GAME_AREA_HEIGHT = 280;
const ORB_SIZE = 30;
const COLLECTIBLE_SIZE = 16;
const WALL_WIDTH = 6;

interface Collectible {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}

interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function TiltMazeGameScreen({ navigation }: any) {
  const { addCoins } = useCoins();
  const initialX = GAME_AREA_WIDTH / 2 - ORB_SIZE / 2;
  const initialY = GAME_AREA_HEIGHT / 2 - ORB_SIZE / 2;

  const [orbX, setOrbX] = useState(initialX);
  const [orbY, setOrbY] = useState(initialY);
  const [gameActive, setGameActive] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [collected, setCollected] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const orbVelXRef = useRef(0);
  const orbVelYRef = useRef(0);
  const gameTimeRef = useRef(0);
  const orbXRef = useRef(initialX);
  const orbYRef = useRef(initialY);
  const accelerometerSubscriptionRef = useRef<any>(null);
  const gameWonRef = useRef(false);

  // Collectibles positioned in the maze
  const collectiblesRef = useRef<Collectible[]>([
    { id: 1, x: 30, y: 30, collected: false },
    { id: 2, x: GAME_AREA_WIDTH - 60, y: 50, collected: false },
    { id: 3, x: 50, y: GAME_AREA_HEIGHT - 60, collected: false },
    {
      id: 4,
      x: GAME_AREA_WIDTH - 50,
      y: GAME_AREA_HEIGHT - 50,
      collected: false,
    },
    {
      id: 5,
      x: GAME_AREA_WIDTH / 2 - 20,
      y: GAME_AREA_HEIGHT / 2 - 30,
      collected: false,
    },
  ]);

  const [collectibles, setCollectibles] = useState(collectiblesRef.current);

  // Maze walls - creating a simple maze pattern
  const mazeWalls: Wall[] = [
    // Top left section
    { x: 20, y: 20, width: 80, height: WALL_WIDTH },
    { x: 20, y: 20, width: WALL_WIDTH, height: 60 },

    // Top right section
    { x: GAME_AREA_WIDTH - 100, y: 20, width: 80, height: WALL_WIDTH },
    { x: GAME_AREA_WIDTH - 30, y: 20, width: WALL_WIDTH, height: 60 },

    // Middle left
    { x: 15, y: GAME_AREA_HEIGHT / 2 - 15, width: 70, height: WALL_WIDTH },

    // Middle right
    {
      x: GAME_AREA_WIDTH - 85,
      y: GAME_AREA_HEIGHT / 2 - 15,
      width: 70,
      height: WALL_WIDTH,
    },

    // Bottom left
    { x: 20, y: GAME_AREA_HEIGHT - 60, width: 80, height: WALL_WIDTH },
    { x: 20, y: GAME_AREA_HEIGHT - 60, width: WALL_WIDTH, height: 40 },

    // Bottom right
    {
      x: GAME_AREA_WIDTH - 100,
      y: GAME_AREA_HEIGHT - 60,
      width: 80,
      height: WALL_WIDTH,
    },
    {
      x: GAME_AREA_WIDTH - 30,
      y: GAME_AREA_HEIGHT - 60,
      width: WALL_WIDTH,
      height: 40,
    },

    // Center obstacles
    {
      x: GAME_AREA_WIDTH / 2 - 40,
      y: GAME_AREA_HEIGHT / 2 - 40,
      width: 80,
      height: WALL_WIDTH,
    },
    {
      x: GAME_AREA_WIDTH / 2 - 20,
      y: GAME_AREA_HEIGHT / 2,
      width: 40,
      height: WALL_WIDTH,
    },

    // Boundaries
    { x: 0, y: 0, width: GAME_AREA_WIDTH, height: WALL_WIDTH },
    {
      x: 0,
      y: GAME_AREA_HEIGHT - WALL_WIDTH,
      width: GAME_AREA_WIDTH,
      height: WALL_WIDTH,
    },
    { x: 0, y: 0, width: WALL_WIDTH, height: GAME_AREA_HEIGHT },
    {
      x: GAME_AREA_WIDTH - WALL_WIDTH,
      y: 0,
      width: WALL_WIDTH,
      height: GAME_AREA_HEIGHT,
    },
  ];

  // Setup accelerometer
  useEffect(() => {
    Accelerometer.setUpdateInterval(20);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      // x is roll (tilt left-right), y is pitch (tilt forward-backward)
      // Use stronger multiplier for more noticeable response
      orbVelXRef.current = -x * 15;
      orbVelYRef.current = y * 15;
    });

    accelerometerSubscriptionRef.current = subscription;

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // Game loop
  useEffect(() => {
    if (!gameActive || gameOver) return;

    const gameLoopInterval = setInterval(() => {
      // Apply friction to velocity
      orbVelXRef.current *= 0.92;
      orbVelYRef.current *= 0.92;

      // Update X position
      let newX = orbXRef.current + orbVelXRef.current;

      // Boundary collision
      if (newX < 0) newX = 0;
      if (newX > GAME_AREA_WIDTH - ORB_SIZE) newX = GAME_AREA_WIDTH - ORB_SIZE;

      // Wall collision
      for (const wall of mazeWalls) {
        if (
          newX + ORB_SIZE > wall.x &&
          newX < wall.x + wall.width &&
          orbYRef.current + ORB_SIZE > wall.y &&
          orbYRef.current < wall.y + wall.height
        ) {
          newX = orbXRef.current;
          break;
        }
      }

      orbXRef.current = newX;

      // Update Y position
      let newY = orbYRef.current + orbVelYRef.current;

      // Boundary collision
      if (newY < 0) newY = 0;
      if (newY > GAME_AREA_HEIGHT - ORB_SIZE)
        newY = GAME_AREA_HEIGHT - ORB_SIZE;

      // Wall collision
      for (const wall of mazeWalls) {
        if (
          orbXRef.current + ORB_SIZE > wall.x &&
          orbXRef.current < wall.x + wall.width &&
          newY + ORB_SIZE > wall.y &&
          newY < wall.y + wall.height
        ) {
          newY = orbYRef.current;
          break;
        }
      }

      orbYRef.current = newY;

      // Check collectible collisions
      setCollectibles((prev) =>
        prev.map((collectible) => {
          if (collectible.collected) return collectible;

          const distance = Math.sqrt(
            Math.pow(
              orbXRef.current +
                ORB_SIZE / 2 -
                (collectible.x + COLLECTIBLE_SIZE / 2),
              2
            ) +
              Math.pow(
                orbYRef.current +
                  ORB_SIZE / 2 -
                  (collectible.y + COLLECTIBLE_SIZE / 2),
                2
              )
          );

          if (distance < ORB_SIZE / 2 + COLLECTIBLE_SIZE / 2) {
            setCollected((prev) => prev + 1);
            return { ...collectible, collected: true };
          }

          return collectible;
        })
      );

      gameTimeRef.current += 0.04;
      setGameTime(Math.floor(gameTimeRef.current));

      // Update state to trigger re-render with new position
      setOrbX(orbXRef.current);
      setOrbY(orbYRef.current);
    }, 40);

    return () => clearInterval(gameLoopInterval);
  }, [gameActive, gameOver]);

  // Check win condition
  useEffect(() => {
    if (gameActive && collected === 5 && !gameWonRef.current) {
      gameWonRef.current = true;
      setGameOver(true);
      const coinsEarned = Math.max(1, 5 - Math.floor(gameTime / 30));
      addCoins(coinsEarned);

      Alert.alert(
        "🎉 Level Complete!",
        `Time: ${gameTime}s\nCollectibles: ${collected}/5\nCoins Earned: ${coinsEarned}`,
        [
          {
            text: "Play Again",
            onPress: () => {
              setOrbX(initialX);
              setOrbY(initialY);
              orbXRef.current = initialX;
              orbYRef.current = initialY;
              setGameTime(0);
              setCollected(0);
              gameTimeRef.current = 0;
              setGameOver(false);
              gameWonRef.current = false;
              collectiblesRef.current = collectiblesRef.current.map((c) => ({
                ...c,
                collected: false,
              }));
              setCollectibles(collectiblesRef.current);
              setGameActive(true);
            },
          },
          {
            text: "Back to Games",
            onPress: () => {
              gameWonRef.current = false;
              navigation.navigate("Games");
            },
          },
        ]
      );
    }
  }, [collected, gameActive]);

  const handleStart = () => {
    setGameActive(true);
    setOrbX(initialX);
    setOrbY(initialY);
    orbXRef.current = initialX;
    orbYRef.current = initialY;
    setGameTime(0);
    setCollected(0);
    gameTimeRef.current = 0;
    setGameOver(false);
    gameWonRef.current = false;
    collectiblesRef.current = collectiblesRef.current.map((c) => ({
      ...c,
      collected: false,
    }));
    setCollectibles(collectiblesRef.current);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.navigate("Games")}>
          <FontAwesome5 name="chevron-left" size={24} color="#6DD19C" />
        </Pressable>
        <Text style={styles.title}>Tilt Maze</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gameContainer}>
          <View style={styles.gameArea}>
            {/* Render walls */}
            {mazeWalls.map((wall, idx) => (
              <View
                key={`wall-${idx}`}
                style={[
                  styles.wall,
                  {
                    left: wall.x,
                    top: wall.y,
                    width: wall.width,
                    height: wall.height,
                  },
                ]}
              />
            ))}

            {/* Render collectibles */}
            {collectibles.map((collectible) =>
              !collectible.collected ? (
                <View
                  key={`collectible-${collectible.id}`}
                  style={[
                    styles.collectible,
                    {
                      left: collectible.x,
                      top: collectible.y,
                    },
                  ]}
                />
              ) : null
            )}

            {/* Render orb */}
            <View
              style={[
                styles.orb,
                {
                  left: orbX,
                  top: orbY,
                },
              ]}
            />
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <FontAwesome5 name="star" size={16} color="#F4D35E" />
              <Text style={styles.statText}>{collected}/5</Text>
            </View>
            <View style={styles.stat}>
              <FontAwesome5 name="clock" size={16} color="#6DD19C" />
              <Text style={styles.statText}>{gameTime}s</Text>
            </View>
          </View>

          <View style={styles.controlsContainer}>
            {!gameActive && !gameOver && (
              <Pressable style={styles.button} onPress={handleStart}>
                <FontAwesome5 name="play" size={20} color="#fff" />
                <Text style={styles.buttonText}>Start Game</Text>
              </Pressable>
            )}
            {gameActive && (
              <Text style={styles.instructionText}>
                Hold your phone flat and tip it slightly to move the orb
              </Text>
            )}
          </View>
        </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  gameContainer: {
    alignItems: "center",
  },
  gameArea: {
    width: GAME_AREA_WIDTH,
    height: GAME_AREA_HEIGHT,
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    position: "relative",
  },
  wall: {
    backgroundColor: "#0f3460",
    position: "absolute",
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: "#FF006E",
    position: "absolute",
    shadowColor: "#FF006E",
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  collectible: {
    width: COLLECTIBLE_SIZE,
    height: COLLECTIBLE_SIZE,
    borderRadius: COLLECTIBLE_SIZE / 2,
    backgroundColor: "#00D9FF",
    position: "absolute",
    shadowColor: "#00D9FF",
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginBottom: 12,
    width: "100%",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  controlsContainer: {
    width: "100%",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#6DD19C",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  instructionText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    marginBottom: 12,
  },
});
