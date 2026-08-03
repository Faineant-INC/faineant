import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, fonts, sizes, spacing } from "@/theme";
import { useBookingStore } from "@/stores/booking";

export default function BookingSuccessScreen() {
  const router = useRouter();
  const reset = useBookingStore((s) => s.reset);
  const { service, windowLabel, location, bookingId } = useBookingStore();

  function handleHome() {
    reset();
    router.replace("/(client)/home");
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.monogramWrap}>
          <Text style={styles.monogram}>F</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            {bookingId
              ? `RESERVATION CONFIRMED · #FAI-${bookingId.slice(0, 8).toUpperCase()}`
              : "RESERVATION STATUS UNAVAILABLE"}
          </Text>
          <Text style={styles.headline}>
            It's <Text style={styles.headlineEm}>booked.</Text>
          </Text>
          <Text style={styles.subhead}>Don't get up early.</Text>
        </View>

        <View style={styles.ticket}>
          <TicketRow label="SERVICE" value={service?.name ?? "—"} />
          <TicketRow label="WHEN" value={windowLabel ?? "—"} />
          <TicketRow label="PRACTITIONER" value={service?.providerName ?? "—"} />
          <TicketRow label="ADDRESS" value={location || "—"} />
          <TicketRow
            label="TOTAL"
            value={
              service
                ? new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(service.priceInCents / 100)
                : "—"
            }
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cta} onPress={handleHome}>
          <Text style={styles.ctaLabel}>BACK TO HOME →</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TicketRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.ticketRow}>
      <Text style={styles.ticketLabel}>{label}</Text>
      <Text style={styles.ticketValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: 96,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
    alignItems: "stretch",
  },
  monogramWrap: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  monogram: {
    fontFamily: fonts.editorialLight,
    fontSize: 96,
    color: colors.accent,
    fontStyle: "italic",
    letterSpacing: -2,
  },
  header: { gap: spacing.sm, alignItems: "center" },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: sizes.mono,
    color: colors.taupe[300],
    letterSpacing: 2,
    textAlign: "center",
  },
  headline: {
    fontFamily: fonts.displayBlack,
    fontSize: 44,
    color: colors.primaryFg,
    letterSpacing: -1.4,
    lineHeight: 48,
    textAlign: "center",
  },
  headlineEm: {
    fontFamily: fonts.editorialLight,
    color: colors.accent,
    fontStyle: "italic",
  },
  subhead: {
    fontFamily: fonts.editorialLight,
    fontSize: sizes.subheading,
    color: colors.secondaryFg,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: spacing.xs,
  },
  ticket: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  ticketRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ticketLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.label,
    color: colors.taupe[300],
    letterSpacing: 2.4,
  },
  ticketValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.mono,
    color: colors.primaryFg,
    letterSpacing: 1.4,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  cta: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  ctaLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.bodySm,
    color: colors.smoke[900],
    letterSpacing: 3,
  },
});
