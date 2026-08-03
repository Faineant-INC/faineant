import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { signIn } from "@/lib/data-client";
import { colors, fonts, sizes, spacing } from "@/theme";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const { registered } = useLocalSearchParams<{ registered?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSignIn() {
    setErr(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErr("EMAIL AND PASSWORD ARE BOTH REQUIRED.");
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErr("THAT EMAIL DOESN'T LOOK RIGHT.");
      return;
    }

    setLoading(true);
    try {
      const user = await signIn(trimmedEmail, password);

      if (user.role === "PROVIDER") {
        router.replace("/(provider)/home");
      } else {
        router.replace("/(client)/home");
      }
    } catch {
      setErr("PASSWORD INCORRECT. NOTHING ELSE HAPPENED.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require("../../../assets/brand/faineant-wordmark-white.png")}
          style={styles.wordmark}
          resizeMode="contain"
        />
        <View style={styles.form}>
          <Text style={styles.label}>SIGN IN</Text>
          <Text style={styles.headline}>
            Open <Text style={styles.headlineEm}>the door.</Text>
          </Text>
          <Text style={styles.lede}>
            One window away from your next reservation.
          </Text>
          {registered === "true" && (
            <Text style={styles.error}>
              CHECK YOUR EMAIL TO CONFIRM THE ACCOUNT, THEN SIGN IN.
            </Text>
          )}
          {err && <Text style={styles.error}>{err}</Text>}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              placeholder="you@somewhere.com"
              placeholderTextColor={colors.taupe[300]}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.taupe[300]}
            />
          </View>
          <Pressable
            onPress={handleSignIn}
            disabled={loading}
            style={[styles.btn, loading && styles.btnDisabled]}
          >
            <Text style={styles.btnText}>
              {loading ? "WAIT…" : "SIGN IN →"}
            </Text>
          </Pressable>
          <Link href="/(auth)/register" style={styles.bottomLink}>
            <Text style={styles.linkText}>
              NEW HERE? OPEN AN ACCOUNT →
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xxl, paddingTop: 80, gap: spacing.xxl },
  wordmark: { width: 180, height: 22, alignSelf: "flex-start" },
  form: { gap: spacing.md, marginTop: 80 },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.label,
    color: colors.taupe[300],
    letterSpacing: 3.5,
    textTransform: "uppercase",
  },
  headline: {
    fontFamily: fonts.displayBlack,
    fontSize: 48,
    color: colors.primaryFg,
    letterSpacing: -1.4,
    lineHeight: 48,
  },
  headlineEm: {
    fontFamily: fonts.editorialLight,
    color: colors.accent,
    fontStyle: "italic",
  },
  lede: {
    fontFamily: fonts.editorial,
    fontSize: sizes.bodyLg,
    color: colors.bone[200],
    fontStyle: "italic",
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.label,
    color: colors.bone[100],
    backgroundColor: colors.oxblood[500],
    padding: spacing.md,
    letterSpacing: 2.6,
    textTransform: "uppercase",
  },
  field: { gap: spacing.sm },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.label,
    color: colors.taupe[300],
    letterSpacing: 3.5,
    textTransform: "uppercase",
  },
  input: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyLg,
    color: colors.primaryFg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.smoke[700],
  },
  btn: {
    backgroundColor: colors.primaryFg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontFamily: fonts.bodyMedium,
    color: colors.background,
    letterSpacing: 3.3,
    fontSize: sizes.label,
    textTransform: "uppercase",
  },
  bottomLink: { marginTop: spacing.xl, alignSelf: "center" },
  linkText: {
    fontFamily: fonts.mono,
    fontSize: sizes.mono,
    color: colors.taupe[300],
    letterSpacing: 0.5,
  },
});
