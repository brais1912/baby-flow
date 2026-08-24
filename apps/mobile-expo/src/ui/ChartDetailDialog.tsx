import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../i18n/I18nProvider";
import { colors, shadows } from "../theme";
import { IconButton } from "./Core";

export function ChartDetailDialog({ visible, title, children, onClose }: {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <Pressable
        onPress={onClose}
        style={styles.backdrop}
        testID="chart-detail-backdrop"
      >
        <Pressable
          accessibilityViewIsModal
          onPress={(event) => event.stopPropagation()}
          style={styles.dialog}
          testID="chart-detail-dialog"
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <IconButton compact icon="×" label={t("common.close")} onPress={onClose} />
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(33, 22, 51, 0.42)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    maxWidth: 420,
    padding: 16,
    width: "100%",
    ...shadows.card,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
  },
});
