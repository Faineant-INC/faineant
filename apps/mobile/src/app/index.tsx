import { useEffect, useState } from "react";
import { View, Text, Image, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { clearTokens, getStoredTokens } from "@/lib/auth";
import { colors, fonts } from "@/theme";

export default function SplashScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { accessToken, user } = await getStoredTokens();

      if (!accessToken || !user) {
        router.replace("/(auth)/login");
      } else if (user.role === "PROVIDER") {
        router.replace("/(provider)/home");
      } else if (user.role === "CLIENT") {
        router.replace("/(client)/home");
      } else {
        await clearTokens();
        router.replace("/(auth)/login");
      }
    } catch {
      router.replace("/(auth)/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container} testID="splash-root">
      <Image
        source={require("../../assets/brand/faineant-wordmark-white.png")}
        style={styles.wordmark}
        resizeMode="contain"
        accessibilityLabel="FAINEANT"
      />
      <Text style={styles.tagline}>House calls for the slow-living.</Text>
      {loading && <ActivityIndicator color={colors.champagne[400]} style={styles.loader} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.smoke[900],
  },
  wordmark: {
    width: 240,
    height: 56,
  },
  tagline: {
    fontSize: 14,
    fontFamily: fonts.editorial,
    fontStyle: "italic",
    color: colors.champagne[400],
    marginTop: 12,
  },
  loader: { marginTop: 32 },
});
