import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { createProduct, getAllProducts, ProductCategory } from "@/lib/database";
import { isVaultLocalRemindersEnabled } from "@/lib/vault-auth";
import { scheduleLocalVaultReminders } from "@/lib/local-reminders";
import { requireVaultDatabaseKey } from "@/lib/vault-service";

const categories: ProductCategory[] = [
  "Software",
  "Game",
  "Subscription",
  "Template",
  "Other",
];

type FormState = {
  name: string;
  vendor: string;
  licenseKey: string;
  serialNumber: string;
  purchaseDate: string;
  expiryDate: string;
  renewalDate: string;
  warrantyExpiryDate: string;
  tags: string;
  notes: string;
  category: ProductCategory;
  isFavorite: boolean;
  isArchived: boolean;
};

const initialForm: FormState = {
  name: "",
  vendor: "",
  licenseKey: "",
  serialNumber: "",
  purchaseDate: "",
  expiryDate: "",
  renewalDate: "",
  warrantyExpiryDate: "",
  tags: "",
  notes: "",
  category: "Software",
  isFavorite: false,
  isArchived: false,
};

export default function AddProductScreen() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    try {
      setSaving(true);
      const key = await requireVaultDatabaseKey();
      await createProduct(
        {
          ...form,
          tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        },
        key,
      );
      if (await isVaultLocalRemindersEnabled()) {
        await scheduleLocalVaultReminders(await getAllProducts(key));
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The product could not be saved.";
      Alert.alert("Unable to save product", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <ThemedText type="title">Add product</ThemedText>
          <ThemedText style={styles.subtitle}>
            Store only what you need. Every field is encrypted in the vault.
          </ThemedText>
        </View>
        <Field
          label="Product name"
          value={form.name}
          onChangeText={(value) => update("name", value)}
          placeholder="e.g. Pro editor"
          required
        />
        <Field
          label="Vendor"
          value={form.vendor}
          onChangeText={(value) => update("vendor", value)}
          placeholder="e.g. Acme Software"
          required
        />
        <Field
          label="License key"
          value={form.licenseKey}
          onChangeText={(value) => update("licenseKey", value)}
          placeholder="Paste key"
          required
          multiline
          autoCapitalize="characters"
        />
        <Field
          label="Serial number"
          value={form.serialNumber}
          onChangeText={(value) => update("serialNumber", value)}
          placeholder="Optional"
          autoCapitalize="characters"
        />
        <ThemedText style={styles.label}>Category</ThemedText>
        <View style={styles.categoryGrid}>
          {categories.map((category) => (
            <Pressable
              key={category}
              onPress={() => update("category", category)}
              style={[
                styles.category,
                form.category === category && styles.categorySelected,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: form.category === category }}
              accessibilityLabel={`${category} category`}
            >
              <ThemedText
                style={[
                  styles.categoryText,
                  form.category === category && styles.categoryTextSelected,
                ]}
              >
                {category}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <Field
          label="Purchase date"
          value={form.purchaseDate}
          onChangeText={(value) => update("purchaseDate", value)}
          placeholder="YYYY-MM-DD (optional)"
          keyboardType="numbers-and-punctuation"
        />
        <Field
          label="Expiry date"
          value={form.expiryDate}
          onChangeText={(value) => update("expiryDate", value)}
          placeholder="YYYY-MM-DD (optional)"
          keyboardType="numbers-and-punctuation"
        />
        <Field
          label="Renewal date"
          value={form.renewalDate}
          onChangeText={(value) => update("renewalDate", value)}
          placeholder="YYYY-MM-DD (optional)"
          keyboardType="numbers-and-punctuation"
        />
        <Field
          label="Warranty expiry date"
          value={form.warrantyExpiryDate}
          onChangeText={(value) => update("warrantyExpiryDate", value)}
          placeholder="YYYY-MM-DD (optional)"
          keyboardType="numbers-and-punctuation"
        />
        <Field
          label="Tags"
          value={form.tags}
          onChangeText={(value) => update("tags", value)}
          placeholder="e.g. work, annual, design"
        />
        <Field
          label="Private notes"
          value={form.notes}
          onChangeText={(value) => update("notes", value)}
          placeholder="Optional"
          multiline
        />
        <View style={styles.switchRow}>
          <View>
            <ThemedText style={styles.label}>Favourite</ThemedText>
            <ThemedText style={styles.helper}>
              Keep this record at the top of your vault list.
            </ThemedText>
          </View>
          <Switch
            value={form.isFavorite}
            onValueChange={(value) => update("isFavorite", value)}
            accessibilityLabel="Mark product as favourite"
            trackColor={{ false: "#94A3B8", true: "#14B8A6" }}
          />
        </View>
        <View style={styles.switchRow}>
          <View>
            <ThemedText style={styles.label}>Archive on save</ThemedText>
            <ThemedText style={styles.helper}>
              Keep the product without showing it as active.
            </ThemedText>
          </View>
          <Switch
            value={form.isArchived}
            onValueChange={(value) => update("isArchived", value)}
            accessibilityLabel="Archive product on save"
            trackColor={{ false: "#94A3B8", true: "#14B8A6" }}
          />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          onPress={() => void save()}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            (pressed || saving) && styles.pressed,
          ]}
        >
          <ThemedText style={styles.saveText}>
            {saving ? "Encrypting…" : "Save securely"}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

function Field({
  label,
  required,
  ...props
}: { label: string; required?: boolean } & React.ComponentProps<
  typeof TextInput
>) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>
        {label}
        {required ? " *" : ""}
      </ThemedText>
      <TextInput
        {...props}
        style={[styles.input, props.multiline && styles.textarea]}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor="#64748B"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  hero: { marginBottom: 24 },
  subtitle: { marginTop: 6, opacity: 0.68, lineHeight: 20 },
  field: { marginBottom: 16 },
  label: { fontWeight: "800", fontSize: 14, marginBottom: 8 },
  input: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 14,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    fontSize: 16,
  },
  textarea: { minHeight: 90, paddingTop: 12, textAlignVertical: "top" },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  category: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: "#E2E8F0",
  },
  categorySelected: { backgroundColor: "#0F766E" },
  categoryText: { fontSize: 13, fontWeight: "700", color: "#334155" },
  categoryTextSelected: { color: "#FFFFFF" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingVertical: 12,
  },
  helper: { fontSize: 12, opacity: 0.65, maxWidth: 240 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  saveButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: "#0F766E",
  },
  saveText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  pressed: { opacity: 0.7 },
});
