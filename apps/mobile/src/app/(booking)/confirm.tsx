import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { createBooking, getMyBookingProfile } from "@/lib/data-client";
import { colors, fonts, sizes, spacing } from "@/theme";
import { useBookingStore } from "@/stores/booking";

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function BookingConfirmScreen() {
  const router = useRouter();
  const {
    service,
    startTime,
    windowLabel,
    location,
    setLocation,
    setBookingId,
  } = useBookingStore();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyBookingProfile()
      .then((profile) => {
        if (!useBookingStore.getState().location && profile.streetAddress) {
          setLocation(profile.streetAddress);
        }
      })
      .catch(() => {
        // An address can still be entered for this reservation.
      })
      .finally(() => setLoadingProfile(false));
  }, [setLocation]);

  async function handleReserve() {
    if (!service || !startTime) {
      setError("Choose a service and opening first.");
      return;
    }
    if (!location.trim()) {
      setError("Enter the address where the practitioner should arrive.");
      return;
    }
    setError(null);
    setReserving(true);
    try {
      const booking = await createBooking({
        serviceId: service.id,
        startTime,
        location: location.trim(),
      });
      setBookingId(booking.id);
      router.replace("/(booking)/success");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The reservation was not created.");
    } finally {
      setReserving(false);
    }
  }

  const ready = Boolean(service && startTime);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>STEP 03 / 04 · CONFIRM</Text>
          <Text style={styles.headline}>
            Open <Text style={styles.headlineEm}>the door.</Text>
          </Text>
        </View>

        {!ready ? (
          <View style={styles.messageBox}>
            <Text style={styles.error}>Choose a service and opening first.</Text>
            <Pressable onPress={() => router.replace("/(booking)/service")}>
              <Text style={styles.link}>START AGAIN →</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.summary}>
              <Row label="SERVICE" value={service?.name ?? ""} />
              <Row label="PRACTITIONER" value={service?.providerName ?? ""} />
              <Row label="WHEN" value={windowLabel ?? ""} />
              <Row label="PRICE" value={money(service?.priceInCents ?? 0)} mono />
            </View>
            <View style={styles.addressBlock}>
              <Text style={styles.rowLabel}>WHERE THEY SHOULD KNOCK</Text>
              {loadingProfile ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Street address, unit, Chicago, IL"
                  placeholderTextColor={colors.taupe[300]}
                  multiline
                  accessibilityLabel="Appointment address"
                  style={styles.addressInput}
                />
              )}
            </View>
          </>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.cta, (!ready || reserving) && styles.ctaDisabled]}
          onPress={handleReserve}
          disabled={!ready || reserving}
        >
          <Text style={styles.ctaLabel}>
            {reserving
              ? "RESERVING…"
              : `RESERVE · ${money(service?.priceInCents ?? 0)}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.rowValueMono]}>{value}</Text>
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
    fontSize: 36,
    color: colors.primaryFg,
    letterSpacing: -1.2,
    lineHeight: 40,
  },
  headlineEm: { fontFamily: fonts.editorialLight, color: colors.accent, fontStyle: "italic" },
  summary: { borderTopWidth: 1, borderTopColor: colors.border },
  row: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.xs },
  rowLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.label,
    color: colors.taupe[300],
    letterSpacing: 2.4,
  },
  rowValue: { fontFamily: fonts.displayMedium, fontSize: sizes.subheading, color: colors.primaryFg },
  rowValueMono: { fontFamily: fonts.mono, color: colors.accent },
  addressBlock: { borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  addressInput: {
    minHeight: 72,
    color: colors.primaryFg,
    fontFamily: fonts.body,
    fontSize: sizes.body,
    textAlignVertical: "top",
  },
  messageBox: { gap: spacing.md },
  error: { color: colors.oxblood[500], fontFamily: fonts.body },
  link: { color: colors.accent, fontFamily: fonts.bodyMedium, letterSpacing: 2 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  cta: { backgroundColor: colors.accent, paddingVertical: spacing.md + 2, alignItems: "center" },
  ctaDisabled: { opacity: 0.35 },
  ctaLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.body,
    color: colors.smoke[900],
    letterSpacing: 2.4,
  },
});
