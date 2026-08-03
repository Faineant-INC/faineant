import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { listConversations } from "@/lib/data-client";
import { colors, fonts, sizes, spacing } from "@/theme";

interface Conversation {
  id: string;
  otherParticipant: { id: string; firstName: string; lastName: string };
  lastMessage: { text: string; createdAt: string } | null;
}

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      setConversations(await listConversations());
    } catch {
      // Handle error silently
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl }}
    >
      <View style={{ paddingTop: 64 }}>
        <Text style={styles.eyebrow}>MESSAGES</Text>
        <Text style={styles.headline}>
          The <Text style={styles.headlineEm}>quiet</Text> inbox.
        </Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyText}>
            Most clients don&rsquo;t message. The few who do are usually about parking.
          </Text>
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {conversations.map((item) => (
            <Pressable key={item.id} style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.otherParticipant.firstName[0]}
                  {item.otherParticipant.lastName[0]}
                </Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.name}>
                  {item.otherParticipant.firstName} {item.otherParticipant.lastName}
                </Text>
                {item.lastMessage && (
                  <Text style={styles.preview} numberOfLines={1}>
                    {item.lastMessage.text}
                  </Text>
                )}
              </View>
            </Pressable>
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
  emptyBlock: {
    paddingLeft: spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: colors.accent,
  },
  emptyText: {
    fontFamily: fonts.editorialLight,
    fontSize: sizes.subheading,
    color: colors.secondaryFg,
    fontStyle: "italic",
    lineHeight: 26,
  },
  row: {
    flexDirection: "row",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    backgroundColor: colors.smoke[800],
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  avatarText: {
    fontFamily: fonts.displayMedium,
    fontSize: sizes.bodySm,
    color: colors.primaryFg,
    letterSpacing: 1,
  },
  rowBody: { flex: 1, justifyContent: "center" },
  name: {
    fontFamily: fonts.displayMedium,
    fontSize: sizes.body,
    color: colors.primaryFg,
  },
  preview: {
    fontFamily: fonts.body,
    fontSize: sizes.bodySm,
    color: colors.taupe[300],
    marginTop: spacing.xs,
  },
});
