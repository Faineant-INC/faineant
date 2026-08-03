import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { getEarnings } from "@/lib/data-client";
import { colors, fonts, sizes, spacing } from "@/theme";

interface EarningsData {
  totalEarnings: number;
  payments: {
    id: string;
    providerPayoutInCents: number;
    createdAt: string;
    booking: { startTime: string; service: { name: string } };
  }[];
}

export default function EarningsScreen() {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEarnings();
  }, []);

  async function loadEarnings() {
    setLoading(true);
    setError(null);
    try {
      setEarnings(await getEarnings());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load earnings");
    } finally {
      setLoading(false);
    }
  }

  const total = earnings ? (earnings.totalEarnings / 100).toFixed(2) : "0.00";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
    >
      <View style={{ paddingTop: 64 }}>
        <Text style={styles.eyebrow}>EARNINGS</Text>
        <Text style={styles.headline}>
          What you've <Text style={styles.headlineEm}>earned.</Text>
        </Text>
      </View>

      <View style={styles.totalBlock}>
        <Text style={styles.totalLabel}>TO DATE</Text>
        <Text style={styles.totalAmount}>${total}</Text>
      </View>

      <View style={{ gap: spacing.md }}>
        <Text style={styles.section}>HISTORY</Text>
        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : !earnings || earnings.payments.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No payments yet.</Text>
            <Text style={styles.emptyBody}>
              Earnings will appear here after your first service.
            </Text>
          </View>
        ) : (
          earnings.payments.map((p) => (
            <View key={p.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.service}>{p.booking.service.name}</Text>
                <Text style={styles.date}>
                  {new Date(p.booking.startTime).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.amount}>
                +${(p.providerPayoutInCents / 100).toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>
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
  totalBlock: {
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.smoke[700],
    gap: spacing.xs,
  },
  totalLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.label,
    color: colors.taupe[400],
    letterSpacing: 3,
  },
  totalAmount: {
    fontFamily: fonts.displayBlack,
    fontSize: 56,
    color: colors.accent,
    letterSpacing: -2,
  },
  section: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.label,
    color: colors.taupe[400],
    letterSpacing: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.smoke[700],
  },
  service: {
    fontFamily: fonts.displayMedium,
    fontSize: sizes.body,
    color: colors.primaryFg,
  },
  date: {
    fontFamily: fonts.mono,
    fontSize: sizes.mono,
    color: colors.taupe[400],
    marginTop: 2,
  },
  amount: {
    fontFamily: fonts.mono,
    fontSize: sizes.bodyLg,
    color: colors.accent,
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
