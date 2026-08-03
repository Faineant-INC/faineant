import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { listClientBookings } from "@/lib/data-client";
import { colors, fonts, sizes, spacing } from "@/theme";

interface Booking {
  id: string;
  status: string;
  startTime: string;
  totalPriceInCents: number;
  service: { name: string };
  providerProfile: { user: { firstName: string; lastName: string } };
}

const UPCOMING_STATUSES = new Set(["PENDING", "CONFIRMED", "IN_PROGRESS"]);

export default function ClientBookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      setBookings(await listClientBookings());
    } catch {
      // Handle error silently
    }
  }

  const upcoming = bookings.filter((b) => UPCOMING_STATUSES.has(b.status));
  const past = bookings.filter((b) => !UPCOMING_STATUSES.has(b.status));
  const hero = upcoming[0];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl }}
    >
      <View style={{ paddingTop: 64 }}>
        <Text style={styles.eyebrow}>YOUR VISITS</Text>
        <Text style={styles.headline}>
          On the <Text style={styles.headlineEm}>calendar.</Text>
        </Text>
      </View>

      {hero ? (
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Next visit</Text>
          <Text style={styles.heroTitle}>{hero.service.name}</Text>
          <Text style={styles.heroProvider}>
            with {hero.providerProfile.user.firstName} {hero.providerProfile.user.lastName}
          </Text>
          <Text style={styles.heroDate}>
            {new Date(hero.startTime).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {" · "}
            {new Date(hero.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      ) : (
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Nothing scheduled</Text>
          <Text style={styles.heroTitle}>The calendar is empty.</Text>
          <Text style={styles.heroProvider}>That, in itself, is a kind of luxury.</Text>
        </View>
      )}

      {past.length > 0 && (
        <View style={{ gap: spacing.md }}>
          <Text style={styles.sectionLabel}>Past visits</Text>
          {past.map((item) => (
            <View key={item.id} style={styles.pastRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pastService}>{item.service.name}</Text>
                <Text style={styles.pastMeta}>
                  {new Date(item.startTime).toLocaleDateString()}
                  {" · "}
                  {item.providerProfile.user.firstName} {item.providerProfile.user.lastName}
                </Text>
              </View>
              <Text style={styles.pastPrice}>${(item.totalPriceInCents / 100).toFixed(0)}</Text>
            </View>
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
  heroCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.label,
    color: colors.taupe[300],
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: sizes.heading,
    color: colors.primaryFg,
  },
  heroProvider: {
    fontFamily: fonts.editorialLight,
    fontSize: sizes.bodyLg,
    color: colors.accent,
    fontStyle: "italic",
  },
  heroDate: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.secondaryFg,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.label,
    color: colors.taupe[300],
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  pastRow: {
    flexDirection: "row",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    alignItems: "center",
  },
  pastService: {
    fontFamily: fonts.displayMedium,
    fontSize: sizes.body,
    color: colors.primaryFg,
  },
  pastMeta: {
    fontFamily: fonts.body,
    fontSize: sizes.bodySm,
    color: colors.taupe[300],
    marginTop: spacing.xs,
  },
  pastPrice: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.body,
    color: colors.secondaryFg,
  },
});
