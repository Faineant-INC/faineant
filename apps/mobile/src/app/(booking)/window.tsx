import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { listAvailableDays, type AvailableDay } from "@/lib/data-client";
import { colors, fonts, sizes, spacing } from "@/theme";
import { useBookingStore } from "@/stores/booking";

type PickedSlot = {
  startTime: string;
  label: string;
};

export default function BookingWindowScreen() {
  const router = useRouter();
  const service = useBookingStore((state) => state.service);
  const setWindow = useBookingStore((state) => state.setWindow);
  const [days, setDays] = useState<AvailableDay[]>([]);
  const [picked, setPicked] = useState<PickedSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!service) {
      setLoading(false);
      setError("Choose a service before selecting a time.");
      return;
    }
    setLoading(true);
    listAvailableDays({
      providerProfileId: service.providerProfileId,
      durationMinutes: service.durationMinutes,
    })
      .then(setDays)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Openings are unavailable."),
      )
      .finally(() => setLoading(false));
  }, [service]);

  function handleContinue() {
    if (!picked) return;
    setWindow(picked.startTime, picked.label);
    router.push("/(booking)/confirm");
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>STEP 02 / 04 · WHEN</Text>
          <Text style={styles.headline}>
            When should <Text style={styles.headlineEm}>they arrive?</Text>
          </Text>
          {service && (
            <Text style={styles.context}>
              {service.providerName} · {service.durationMinutes} minutes
            </Text>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} />
        ) : error ? (
          <View style={styles.messageBox}>
            <Text style={styles.error}>{error}</Text>
            {!service && (
              <Pressable onPress={() => router.replace("/(booking)/service")}>
                <Text style={styles.link}>CHOOSE A SERVICE →</Text>
              </Pressable>
            )}
          </View>
        ) : days.length === 0 ? (
          <Text style={styles.empty}>
            No conflict-free openings are published in the next two weeks.
          </Text>
        ) : (
          <View style={styles.days}>
            {days.map((block) => (
              <View key={block.dateKey} style={styles.dayBlock}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayName}>{block.dayLabel}</Text>
                  <Text style={styles.dayDate}>{block.dateLabel}</Text>
                </View>
                <View style={styles.pills}>
                  {block.slots.map((slot) => {
                    const isPicked = picked?.startTime === slot.startTime;
                    const fullLabel = `${block.dayLabel} · ${block.dateLabel} · ${slot.label}`;
                    return (
                      <Pressable
                        key={slot.startTime}
                        style={[styles.pill, isPicked && styles.pillSelected]}
                        onPress={() =>
                          setPicked({ startTime: slot.startTime, label: fullLabel })
                        }
                      >
                        <Text style={[styles.pillLabel, isPicked && styles.pillLabelSelected]}>
                          {slot.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.cta, !picked && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={!picked}
        >
          <Text style={styles.ctaLabel}>CONTINUE →</Text>
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
  headlineEm: { fontFamily: fonts.editorialLight, color: colors.accent, fontStyle: "italic" },
  context: { fontFamily: fonts.editorialLight, color: colors.secondaryFg, fontStyle: "italic" },
  days: { gap: spacing.lg },
  dayBlock: { gap: spacing.sm },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  dayName: { fontFamily: fonts.displayMedium, fontSize: sizes.subheading, color: colors.primaryFg },
  dayDate: { fontFamily: fonts.mono, fontSize: sizes.mono, color: colors.taupe[300] },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
  },
  pillSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillLabel: { fontFamily: fonts.mono, fontSize: sizes.mono, color: colors.primaryFg },
  pillLabelSelected: { color: colors.smoke[900] },
  messageBox: { gap: spacing.md },
  error: { color: colors.oxblood[500], fontFamily: fonts.body },
  link: { color: colors.accent, fontFamily: fonts.bodyMedium, letterSpacing: 2 },
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
