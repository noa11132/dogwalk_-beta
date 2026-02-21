import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";


// 메인화면(지도) 아래 네비게이션바 설정 <랭킹 / 산책하기 / 커뮤니티 / 프로필>
const TAB_CONFIG = [
  { key: "ranking", 
    label: "랭킹", 
    icon: "crown-outline", 
    iconActive: "crown" },
  {
    key: "walk",
    label: "산책하기",
    icon: "paw-outline",
    iconActive: "paw",
  },
  {
    key: "community",
    label: "커뮤니티",
    icon: "forum-outline",
    iconActive: "forum",
  },
  {
    key: "profile",
    label: "프로필",
    icon: "account-outline",
    iconActive: "account",
  },
];

export default function BottomTabBar({ activeTab = "walk", onTabPress, communityBadgeCount = 0 }) {
  return (
    <View style={styles.container}>
      {TAB_CONFIG.map((tab) => {
        const isActive = activeTab === tab.key;
        const badgeCount = tab.key === "community" ? communityBadgeCount : null;
        const showBadge = badgeCount != null && badgeCount > 0;
        return (
          <Pressable
            key={tab.key}
            style={({ pressed }) => [
              styles.tabButton,
              pressed && styles.tabButtonPressed,
            ]}
            onPress={() => onTabPress?.(tab.key)}
          >
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons
                name={isActive ? tab.iconActive : tab.icon}
                size={24}
                color={isActive ? "#000" : "#999"}
              />
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                isActive && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabButtonPressed: {
    opacity: 0.7,
  },
  iconWrapper: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: "#e53935",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#999",
  },
  tabLabelActive: {
    color: "#000",
    fontWeight: "600",
  },
});
