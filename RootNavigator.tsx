import React from "react";
import { Pressable, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { FontAwesome5 } from "@expo/vector-icons";
import HomeScreen from "./HomeScreen";
import { CoinProvider } from "./contexts/CoinContext";
import ShopScreen from "./screens/ShopScreen";
import MemoryGameScreen from "./screens/MemoryGameScreen";
import ProfileScreen from "./screens/ProfileScreen";

const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: any;
          if (route.name === "Home") iconName = "home";
          else if (route.name === "Shop") iconName = "shopping-bag";
          else if (route.name === "History") iconName = "history";
          else if (route.name === "Profile") iconName = "user";
          return <FontAwesome5 name={iconName} size={size} color={color} />;
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
        name="Minigame"
        component={MemoryGameScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="gamepad" size={size} color={color} />
          ),
          tabBarLabel: "Minigame",
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <CoinProvider>
      <NavigationContainer>
        <MainTabs />
      </NavigationContainer>
    </CoinProvider>
  );
}
