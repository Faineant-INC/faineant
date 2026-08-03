import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  type ImageSourcePropType,
} from "react-native";
import { useRouter } from "expo-router";
import { SERVICE_CATEGORIES, type ServiceCategorySlug } from "@faineant/shared";
import { listProviders } from "@/lib/data-client";
import { colors, fonts, sizes, spacing } from "@/theme";

interface Provider {
  id: string;
  slug: string;
  businessName: string | null;
  bio: string | null;
  averageRating: number;
  totalReviews: number;
  distance: number | null;
  user: { firstName: string; lastName: string };
  services: { name: string; priceInCents: number }[];
}

const tileImages: Record<ServiceCategorySlug, ImageSourcePropType> = {
  hair: require("../../../assets/brand/photography/tile-hair.png"),
  nails: require("../../../assets/brand/photography/tile-nails.png"),
  face: require("../../../assets/brand/photography/tile-face.png"),
  lash: require("../../../assets/brand/photography/tile-lash.png"),
  barber: require("../../../assets/brand/photography/tile-barber.png"),
  makeup: require("../../../assets/brand/photography/tile-makeup.png"),
};

export default function ClientHomeScreen() {
  const router = useRouter();
  const [, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    setLoading(true);
    setError(null);
    try {
      setProviders(await listProviders());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load providers");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl }}
    >
      <View style={{ paddingTop: 64 }}>
        <Text style={styles.eyebrow}>TODAY</Text>
        <Text style={styles.headline}>
          What <Text style={styles.headlineEm}>nothing</Text> are we doing?
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <View style={{ gap: spacing.md }}>
          {SERVICE_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.slug}
              style={styles.tile}
              onPress={() => router.push(`/(booking)/service?slug=${cat.slug}`)}
            >
              <Image source={tileImages[cat.slug]} style={styles.tileImage} resizeMode="cover" />
              <View style={styles.tileBody}>
                <Text style={styles.tileNumber}>{cat.numberLabel}</Text>
                <Text style={styles.tileLabel}>{cat.label}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.label,
    color: colors.taupe[300],
    letterSpacing: 3.5,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  headline: {
    fontFamily: fonts.displayBlack,
    fontSize: 40,
    color: colors.primaryFg,
    letterSpacing: -1.2,
    lineHeight: 40,
  },
  headlineEm: {
    fontFamily: fonts.editorialLight,
    color: colors.accent,
    fontStyle: "italic",
  },
  tile: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  tileImage: {
    width: "100%",
    height: 180,
    backgroundColor: colors.smoke[800],
  },
  tileBody: {
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tileNumber: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.label,
    color: colors.taupe[300],
    letterSpacing: 2.4,
  },
  tileLabel: {
    fontFamily: fonts.displayMedium,
    fontSize: sizes.subheading,
    color: colors.primaryFg,
  },
  error: {
    color: colors.taupe[300],
    fontFamily: fonts.body,
    fontSize: sizes.body,
  },
});
