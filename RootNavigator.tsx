import React, { useState, useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Accelerometer } from "expo-sensors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import {
  Home,
  ShoppingBag,
  History,
  Backpack,
  Gamepad2,
} from "lucide-react-native";
import HomeScreen from "./HomeScreen";
import { CoinProvider } from "./contexts/CoinContext";
import ShopScreen from "./screens/ShopScreen";
import GamesScreen from "./screens/GamesScreen";
import MemoryGameScreen from "./screens/MemoryGameScreen";
import SequenceGameScreen from "./screens/SequenceGameScreen";
import SpaceGameScreen from "./screens/SpaceGameScreen";
import TiltMazeGameScreen from "./screens/TiltMazeGameScreen";
import BackpackScreen from "./screens/BackpackScreen";
import MeteorIntroScreen from "./screens/MeteorIntroScreen";

export const OnboardingContext = React.createContext<{
  resetOnboarding: () => Promise<void>;
  resetCounter: number;
} | null>(null);

const Tab = createBottomTabNavigator();
const GamesStack = createNativeStackNavigator();

function GamesNavigator() {
  return (
    <GamesStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <GamesStack.Screen name="Games" component={GamesScreen} />
      <GamesStack.Screen name="MemoryGame" component={MemoryGameScreen} />
      <GamesStack.Screen name="SequenceGame" component={SequenceGameScreen} />
      <GamesStack.Screen name="SpaceGame" component={SpaceGameScreen} />
      <GamesStack.Screen name="TiltMaze" component={TiltMazeGameScreen} />
    </GamesStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          // size + color are passed by React Navigation
          if (route.name === "Home") {
            return <Home color={color} size={size} />;
          } else if (route.name === "Shop") {
            return <ShoppingBag color={color} size={size} />;
          } else if (route.name === "History") {
            return <History color={color} size={size} />;
          } else if (route.name === "Backpack") {
            return <Backpack color={color} size={size} />;
          }
          return null;
        },
        tabBarActiveTintColor: "#6DD19C",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#eee",
        },
        tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Shop" component={ShopScreen} />
      <Tab.Screen
        name="Games"
        component={GamesNavigator}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Gamepad2 color={color} size={size} />
          ),
          tabBarLabel: "Games",
        }}
      />
      <Tab.Screen
        name="Backpack"
        component={BackpackScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Backpack color={color} size={size} />
          ),
          tabBarLabel: "Backpack",
        }}
      />
    </Tab.Navigator>
  );
}

const HATCH_STORAGE_KEY = "zibu_hatched_v1";
const METEOR_INTRO_STORAGE_KEY = "zibu_meteor_intro_seen_v1";

export default function RootNavigator() {
  const [step, setStep] = useState<"intro" | "egg" | "main">("intro");
  const [hatchShakeCount, setHatchShakeCount] = useState(0);
  const [eggAnimStage, setEggAnimStage] = useState<0 | 1 | 2>(0); // 0: still, 1: basic, 2: intense
  const [resetCounter, setResetCounter] = useState(0); // Increment when reset happens
  const shakeThreshold = 1.2;
  const requiredShakes = 60;
  const lastShakeRef = useRef(Date.now());
  const eggAnim = useRef(new Animated.Value(0)).current;

  // Initialize onboarding state from storage
  useEffect(() => {
    const initializeOnboarding = async () => {
      try {
        const meteorSeen = await AsyncStorage.getItem(METEOR_INTRO_STORAGE_KEY);
        const hatched = await AsyncStorage.getItem(HATCH_STORAGE_KEY);

        if (meteorSeen === "true" && hatched === "true") {
          setStep("main");
        } else if (meteorSeen === "true") {
          setStep("egg");
        } else {
          setStep("intro");
        }
      } catch (e) {
        console.warn("Failed to initialize onboarding", e);
        setStep("intro");
      }
    };
    initializeOnboarding();
  }, []);

  // Reset function for onboarding
  const resetOnboarding = async () => {
    await AsyncStorage.removeItem(HATCH_STORAGE_KEY);
    await AsyncStorage.removeItem(METEOR_INTRO_STORAGE_KEY);
    setHatchShakeCount(0);
    setStep("intro");
    setResetCounter((prev) => prev + 1); // Signal reset to HomeScreen
  };

  // Only run shake effect when on egg screen
  useEffect(() => {
    if (step !== "egg") return;
    let subscription: any;
    Accelerometer.setUpdateInterval(100);
    subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      if (magnitude > shakeThreshold) {
        const now = Date.now();
        if (now - lastShakeRef.current > 400) {
          lastShakeRef.current = now;
          setHatchShakeCount((count) => {
            const next = count + 1;
            // Animation stage logic
            if (next === 20) setEggAnimStage(1);
            if (next === 40) setEggAnimStage(2);
            if (next >= requiredShakes) {
              AsyncStorage.setItem(HATCH_STORAGE_KEY, "true");
              setStep("main");
              subscription && subscription.remove();
            }
            return next;
          });
        }
      }
    });
    return () => {
      subscription && subscription.remove();
    };
  }, [step]);

  // Animate egg when anim stage changes
  useEffect(() => {
    if (eggAnimStage === 1) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(eggAnim, {
            toValue: 1,
            duration: 200,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(eggAnim, {
            toValue: -1,
            duration: 200,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
        { iterations: -1 }
      ).start();
    } else if (eggAnimStage === 2) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(eggAnim, {
            toValue: 2,
            duration: 120,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(eggAnim, {
            toValue: -2,
            duration: 120,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
        { iterations: -1 }
      ).start();
    } else {
      eggAnim.stopAnimation();
      eggAnim.setValue(0);
    }
  }, [eggAnimStage]);

  // Meteor intro screen
  if (step === "intro") {
    return (
      <MeteorIntroScreen
        onContinue={async () => {
          await AsyncStorage.setItem(METEOR_INTRO_STORAGE_KEY, "true");
          setStep("egg");
        }}
      />
    );
  }

  // Egg shake screen
  if (step === "egg") {
    // Egg shake animation: translateX for shake effect
    let shakeRange = 0;
    if (eggAnimStage === 1) shakeRange = 10;
    if (eggAnimStage === 2) shakeRange = 30;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F6F6" }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Animated.View
            style={{
              marginBottom: 32,
              transform: [
                {
                  translateX: eggAnim.interpolate({
                    inputRange: [-2, 2],
                    outputRange: [-shakeRange, shakeRange],
                  }),
                },
                {
                  rotate: eggAnim.interpolate({
                    inputRange: [-2, 2],
                    outputRange: [
                      eggAnimStage === 2 ? "-18deg" : "-8deg",
                      eggAnimStage === 2 ? "18deg" : "8deg",
                    ],
                  }),
                },
              ],
            }}
          >
            <Image
              source={require("./assets/egg/egg.png")}
              style={{ width: 220, height: 220 }}
              contentFit="contain"
            />
          </Animated.View>
          <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 12 }}>
            Shake to Hatch!
          </Text>
          <View
            style={{
              width: 180,
              height: 18,
              backgroundColor: "#eee",
              borderRadius: 9,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: `${Math.min(
                  100,
                  (hatchShakeCount / requiredShakes) * 100
                )}%`,
                height: "100%",
                backgroundColor: "#6DD19C",
              }}
            />
          </View>
          <Text style={{ fontSize: 16, color: "#888" }}>
            {hatchShakeCount} / {requiredShakes} shakes
          </Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 32 }}>
            <Pressable
              style={{
                backgroundColor: "#E94F37",
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 8,
              }}
              onPress={resetOnboarding}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                Reset Egg
              </Text>
            </Pressable>
            <Pressable
              style={{
                backgroundColor: "#F4D35E",
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 8,
              }}
              onPress={() => setHatchShakeCount(60)}
            >
              <Text style={{ color: "#333", fontWeight: "700", fontSize: 14 }}>
                Dev: Set to 60
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Main app with navigation
  return (
    <CoinProvider>
      <OnboardingContext.Provider value={{ resetOnboarding, resetCounter }}>
        <NavigationContainer>
          <MainTabs />
        </NavigationContainer>
      </OnboardingContext.Provider>
    </CoinProvider>
  );
}
