import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { listProviderBookings } from "@/lib/data-client";
import { colors, fonts, sizes, spacing } from "@/theme";

interface Booking {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  service: { name: string };
  client: { firstName: string; lastName: string };
}

export default function ProviderHomeScreen() {
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadToday();
  }, []);

  async function loadToday() {
    setLoading(true);
    setError(null);
    try {
      const bookings = await listProviderBookings();
      const today = new Date().toDateString();
      setTodayBookings(
        bookings.filter((b) => new Date(b.startTime).toDateString() === today),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load today's bookings",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
    >
      <View style={{ paddingTop: 64 }}>
        <Text style={styles.eyebrow}>TODAY</Text>
        <Text style={styles.headline}>
          Your <Text style={styles.headlineEm}>calendar.</Text>
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : todayBookings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing on the books.</Text>
          <Text style={styles.emptyBody}>
            The day is yours. Sit with it.
          </Text>
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {todayBookings.map((b) => (
            <View key={b.id} style={styles.row}>
              <Text style={styles.time}>
                {new Date(b.startTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <View style={styles.details}>
                <Text style={styles.service}>{b.service.name}</Text>
                <Text style={styles.client}>
                  {b.client.firstName} {b.client.lastName}
                </Text>
              </View>
              <Text style={styles.status}>{b.status.toLowerCase()}</Text>
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
  },
  headline: {
    fontFamily: fonts.displayBlack,
    fontSize: 40,
    color: colors.primaryFg,
    letterSpacing: -1.2,
    marginTop: spacing.sm,
    lineHeight: 44,
  },
  headlineEm: {
    fontFamily: fonts.editorialLight,
    color: colors.accent,
    fontStyle: "italic",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.smoke[700],
    gap: spacing.md,
  },
  time: {
    fontFamily: fonts.mono,
    fontSize: sizes.mono,
    color: colors.accent,
    width: 64,
    letterSpacing: 1,
  },
  details: { flex: 1 },
  service: {
    fontFamily: fonts.displayMedium,
    fontSize: sizes.bodyLg,
    color: colors.primaryFg,
  },
  client: {
    fontFamily: fonts.body,
    fontSize: sizes.bodySm,
    color: colors.taupe[300],
    marginTop: 2,
  },
  status: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.label,
    color: colors.taupe[400],
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  empty: { paddingVertical: spacing.xl, gap: spacing.sm },
  emptyTitle: {
    fontFamily: fonts.editorialLight,
    fontSize: sizes.heading,
    color: colors.primaryFg,
    fontStyle: "italic",
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.taupe[300],
    lineHeight: 22,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.oxblood[500],
  },
});
