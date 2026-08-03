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
import { Link, useRouter } from "expo-router";
import { signUp } from "@/lib/data-client";
import { colors, fonts, sizes, spacing } from "@/theme";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Role = "CLIENT" | "PROVIDER";

export default function RegisterScreen() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("CLIENT");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function validate(): boolean {
    if (!form.firstName.trim()) {
      setErr("FIRST NAME IS REQUIRED.");
      return false;
    }
    if (!form.lastName.trim()) {
      setErr("LAST NAME IS REQUIRED.");
      return false;
    }
    const trimmedEmail = form.email.trim();
    if (!trimmedEmail) {
      setErr("EMAIL IS REQUIRED.");
      return false;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErr("THAT EMAIL DOESN'T LOOK RIGHT.");
      return false;
    }
    if (form.password.length < 8) {
      setErr("PASSWORD MUST BE AT LEAST EIGHT CHARACTERS.");
      return false;
    }
    return true;
  }

  async function handleRegister() {
    setErr(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        role,
      };
      const result = await signUp(payload);
      if (!result.hasSession) {
        router.replace({
          pathname: "/(auth)/login",
          params: { registered: "true" },
        });
        return;
      }

      if (result.user.role === "PROVIDER") {
        router.replace("/(provider)/home");
      } else {
        router.replace("/(client)/home");
      }
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message.toUpperCase()
          : "SOMETHING WENT WRONG. TRY AGAIN."
      );
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
          <Text style={styles.label}>CREATE AN ACCOUNT</Text>
          <Text style={styles.headline}>
            An hour <Text style={styles.headlineEm}>of nothing</Text> awaits.
          </Text>
          <Text style={styles.lede}>
            Five details, no junk mail. Cancellation is always free.
          </Text>
          {err && <Text style={styles.error}>{err}</Text>}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>I AM A</Text>
            <View style={styles.roleToggle}>
              {(["CLIENT", "PROVIDER"] as const).map((r) => (
                <Pressable
                  key={r}
                  style={[
                    styles.roleButton,
                    role === r && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole(r)}
                >
                  <Text
                    style={[
                      styles.roleText,
                      role === r && styles.roleTextActive,
                    ]}
                  >
                    {r === "CLIENT" ? "CLIENT" : "PROFESSIONAL"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>FIRST NAME</Text>
            <TextInput
              value={form.firstName}
              onChangeText={(v) => setForm((f) => ({ ...f, firstName: v }))}
              style={styles.input}
              placeholder="Maeve"
              placeholderTextColor={colors.taupe[300]}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>LAST NAME</Text>
            <TextInput
              value={form.lastName}
              onChangeText={(v) => setForm((f) => ({ ...f, lastName: v }))}
              style={styles.input}
              placeholder="Lévesque"
              placeholderTextColor={colors.taupe[300]}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              value={form.email}
              onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
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
              value={form.password}
              onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
              secureTextEntry
              style={styles.input}
              placeholder="EIGHT CHARACTERS, MINIMUM"
              placeholderTextColor={colors.taupe[300]}
            />
          </View>

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            style={[styles.btn, loading && styles.btnDisabled]}
          >
            <Text style={styles.btnText}>
              {loading ? "WAIT…" : "OPEN AN ACCOUNT →"}
            </Text>
          </Pressable>
          <Link href="/(auth)/login" style={styles.bottomLink}>
            <Text style={styles.linkText}>ALREADY A CLIENT? SIGN IN →</Text>
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
  form: { gap: spacing.md, marginTop: 60 },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.label,
    color: colors.taupe[300],
    letterSpacing: 3.5,
    textTransform: "uppercase",
  },
  headline: {
    fontFamily: fonts.displayBlack,
    fontSize: 44,
    color: colors.primaryFg,
    letterSpacing: -1.4,
    lineHeight: 46,
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
  roleToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.smoke[700],
  },
  roleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  roleButtonActive: {
    backgroundColor: colors.primaryFg,
  },
  roleText: {
    fontFamily: fonts.bodyMedium,
    fontSize: sizes.label,
    color: colors.taupe[300],
    letterSpacing: 3.3,
    textTransform: "uppercase",
  },
  roleTextActive: {
    color: colors.background,
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
