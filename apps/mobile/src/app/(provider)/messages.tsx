import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { listConversations } from "@/lib/data-client";
import { colors, fonts, sizes, spacing } from "@/theme";

interface Conversation {
  id: string;
  otherParticipant: { id: string; firstName: string; lastName: string };
  lastMessage: { text: string; createdAt: string } | null;
}

export default function ProviderMessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      setConversations(await listConversations());
    } catch {
      // Handle error
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
    >
      <View style={{ paddingTop: 64 }}>
        <Text style={styles.eyebrow}>MESSAGES</Text>
        <Text style={styles.headline}>
          A quiet <Text style={styles.headlineEm}>inbox.</Text>
        </Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            Most clients don't message.
          </Text>
          <Text style={styles.emptyBody}>
            The few who do are usually about parking.
          </Text>
        </View>
      ) : (
        <View>
          {conversations.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.row}
              activeOpacity={0.7}
            >
              <Text style={styles.name}>
                {c.otherParticipant.firstName} {c.otherParticipant.lastName}
              </Text>
              {c.lastMessage && (
                <Text style={styles.preview} numberOfLines={1}>
                  {c.lastMessage.text}
                </Text>
              )}
            </TouchableOpacity>
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
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.smoke[700],
  },
  name: {
    fontFamily: fonts.displayMedium,
    fontSize: sizes.bodyLg,
    color: colors.primaryFg,
  },
  preview: {
    fontFamily: fonts.body,
    fontSize: sizes.bodySm,
    color: colors.taupe[300],
    marginTop: 2,
  },
  empty: { paddingVertical: spacing.xl, gap: spacing.sm },
  emptyTitle: {
    fontFamily: fonts.editorialLight,
    fontSize: sizes.heading,
    color: colors.primaryFg,
    fontStyle: "italic",
    lineHeight: 32,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.taupe[300],
    lineHeight: 22,
  },
});
