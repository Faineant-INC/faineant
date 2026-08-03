import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import {
  listProviderBookings,
  updateBookingStatus,
} from "@/lib/data-client";
import { colors, fonts, sizes, spacing } from "@/theme";

interface Booking {
  id: string;
  status: string;
  startTime: string;
  totalPriceInCents: number;
  notes: string | null;
  service: { name: string };
  client: { firstName: string; lastName: string };
}

export default function ProviderBookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      setBookings(await listProviderBookings());
    } catch {
      // Handle error
    }
  }

  async function updateStatus(bookingId: string, status: string) {
    try {
      await updateBookingStatus(bookingId, status);
      loadBookings();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to update");
    }
  }

  const now = Date.now();
  const upcoming = bookings.filter((b) => new Date(b.startTime).getTime() >= now);
  const past = bookings.filter((b) => new Date(b.startTime).getTime() < now);

  function renderCard(item: Booking) {
    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.service}>{item.service.name}</Text>
          <Text style={styles.price}>
            ${(item.totalPriceInCents / 100).toFixed(2)}
          </Text>
        </View>
        <Text style={styles.client}>
          {item.client.firstName} {item.client.lastName}
        </Text>
        <Text style={styles.date}>
          {new Date(item.startTime).toLocaleDateString()} at{" "}
          {new Date(item.startTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>

        {item.status === "PENDING" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => updateStatus(item.id, "CONFIRMED")}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => updateStatus(item.id, "CANCELLED")}
              activeOpacity={0.8}
            >
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
        {item.status === "CONFIRMED" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => updateStatus(item.id, "IN_PROGRESS")}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>Start</Text>
            </TouchableOpacity>
          </View>
        )}
        {item.status === "IN_PROGRESS" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => updateStatus(item.id, "COMPLETED")}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>Complete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
    >
      <View style={{ paddingTop: 64 }}>
        <Text style={styles.eyebrow}>BOOKINGS</Text>
        <Text style={styles.headline}>
          All <Text style={styles.headlineEm}>windows.</Text>
        </Text>
      </View>

      {bookings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Quiet so far.</Text>
          <Text style={styles.emptyBody}>
            Reservations from clients will appear here.
          </Text>
        </View>
      ) : (
        <View style={{ gap: spacing.lg }}>
          {upcoming.length > 0 && (
            <View style={{ gap: spacing.md }}>
              <Text style={styles.section}>UPCOMING</Text>
              {upcoming.map(renderCard)}
            </View>
          )}
          {past.length > 0 && (
            <View style={{ gap: spacing.md }}>
              <Text style={styles.section}>PAST</Text>
              {past.map(renderCard)}
            </View>
          )}
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
  section: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.label,
    color: colors.taupe[400],
    letterSpacing: 3,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.smoke[700],
    backgroundColor: colors.smoke[800],
    padding: spacing.md,
    gap: 4,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  service: {
    fontFamily: fonts.displayMedium,
    fontSize: sizes.bodyLg,
    color: colors.primaryFg,
  },
  price: {
    fontFamily: fonts.mono,
    fontSize: sizes.body,
    color: colors.accent,
  },
  client: {
    fontFamily: fonts.body,
    fontSize: sizes.bodySm,
    color: colors.taupe[300],
  },
  date: {
    fontFamily: fonts.mono,
    fontSize: sizes.mono,
    color: colors.taupe[400],
    marginTop: 2,
  },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  confirmBtn: {
    backgroundColor: colors.champagne[400],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  confirmText: {
    color: colors.smoke[950],
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.bodySm,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  declineBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.taupe[500],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  declineText: {
    color: colors.taupe[300],
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.bodySm,
    letterSpacing: 1,
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
});
