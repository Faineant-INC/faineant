import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SERVICE_CATEGORIES, type ServiceCategorySlug } from "@faineant/shared";
import {
  listBookableServices,
  type BookableService,
} from "@/lib/data-client";
import { colors, fonts, sizes, spacing } from "@/theme";
import { useBookingStore } from "@/stores/booking";

function price(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function BookingServiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();
  const setService = useBookingStore((state) => state.setService);
  const category = useMemo(
    () =>
      SERVICE_CATEGORIES.find((candidate) => candidate.slug === params.slug)
        ?.slug as ServiceCategorySlug | undefined,
    [params.slug],
  );
  const [services, setServices] = useState<BookableService[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listBookableServices(category)
      .then(setServices)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "The menu is unavailable."),
      )
      .finally(() => setLoading(false));
  }, [category]);

  function handleContinue() {
    const selected = services.find((service) => service.id === selectedId);
    if (!selected) return;
    setService(selected);
    router.push("/(booking)/window");
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>STEP 01 / 04 · CHOOSE</Text>
          <Text style={styles.headline}>
            Choose the <Text style={styles.headlineEm}>live menu.</Text>
          </Text>
          {category && (
            <Text style={styles.context}>
              {SERVICE_CATEGORIES.find((item) => item.slug === category)?.label} · approved practitioners
            </Text>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : services.length === 0 ? (
          <Text style={styles.empty}>
            No approved service is published in this category yet.
          </Text>
        ) : (
          <View style={styles.tiles}>
            {services.map((service, index) => {
              const isSelected = selectedId === service.id;
              return (
                <Pressable
                  key={service.id}
                  style={[styles.tile, isSelected && styles.tileSelected]}
                  onPress={() => setSelectedId(service.id)}
                >
                  <View style={styles.tileTop}>
                    <Text style={[styles.tileNumber, isSelected && styles.selectedText]}>
                      № {(index + 1).toString().padStart(2, "0")}
                    </Text>
                    <Text style={[styles.tilePrice, isSelected && styles.selectedText]}>
                      {price(service.priceInCents)}
                    </Text>
                  </View>
                  <Text style={[styles.tileLabel, isSelected && styles.selectedText]}>
                    {service.name}
                  </Text>
                  <Text style={[styles.tileMeta, isSelected && styles.selectedText]}>
                    {service.providerName} · {service.durationMinutes} min
                  </Text>
                  {service.description && (
                    <Text style={[styles.tileDescription, isSelected && styles.selectedText]}>
                      {service.description}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.cta, !selectedId && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={!selectedId}
        >
          <Text style={styles.ctaLabel}>SEE OPENINGS →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: 72,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  header: { gap: spacing.md },
  eyebrow: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.label,
    color: colors.taupe[300],
    letterSpacing: 3.5,
  },
  headline: {
    fontFamily: fonts.displayBlack,
    fontSize: 40,
    color: colors.primaryFg,
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  headlineEm: {
    fontFamily: fonts.editorialLight,
    color: colors.accent,
    fontStyle: "italic",
  },
  context: {
    fontFamily: fonts.editorialLight,
    color: colors.secondaryFg,
    fontSize: sizes.body,
    fontStyle: "italic",
  },
  tiles: { gap: spacing.sm },
  tile: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  tileSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  tileTop: { flexDirection: "row", justifyContent: "space-between" },
  tileNumber: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.label,
    color: colors.taupe[300],
    letterSpacing: 2.4,
  },
  tilePrice: { fontFamily: fonts.mono, fontSize: sizes.mono, color: colors.accent },
  tileLabel: { fontFamily: fonts.displayMedium, fontSize: sizes.subheading, color: colors.primaryFg },
  tileMeta: { fontFamily: fonts.mono, fontSize: sizes.mono, color: colors.taupe[300] },
  tileDescription: { fontFamily: fonts.editorialLight, fontStyle: "italic", color: colors.secondaryFg },
  selectedText: { color: colors.smoke[900] },
  error: { color: colors.oxblood[500], fontFamily: fonts.body },
  empty: { color: colors.secondaryFg, fontFamily: fonts.editorialLight, fontStyle: "italic" },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  cta: { backgroundColor: colors.accent, paddingVertical: spacing.md, alignItems: "center" },
  ctaDisabled: { opacity: 0.35 },
  ctaLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.bodySm,
    color: colors.smoke[900],
    letterSpacing: 3,
  },
});
