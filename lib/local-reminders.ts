import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { Product } from "./database";

const REMINDER_CHANNEL_ID = "vault-reminders";
const REMINDER_KIND = "tsvault-local-reminder";
const REMINDER_OFFSETS_DAYS = [30, 7] as const;
const MAX_REMINDERS = 96;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function upcomingDate(product: Product): string | undefined {
  return (
    product.renewalDate ?? product.expiryDate ?? product.warrantyExpiryDate
  );
}

function scheduledDateFor(dateText: string, offsetDays: number): Date | null {
  const eventDate = new Date(`${dateText}T09:00:00`);
  if (Number.isNaN(eventDate.getTime())) return null;
  const triggerDate = new Date(eventDate.getTime() - offsetDays * 86_400_000);
  return triggerDate.getTime() > Date.now() ? triggerDate : null;
}

async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: "Vault reminders",
      description: "Private local TSVaultKeySafe renewal and expiry reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      vibrationPattern: [0],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function cancelLocalVaultReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(
        (notification) => notification.content.data?.kind === REMINDER_KIND,
      )
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier),
      ),
  );
}

export async function scheduleLocalVaultReminders(
  products: Product[],
): Promise<number> {
  const allowed = await ensureNotificationPermission();
  if (!allowed) {
    throw new Error(
      "Allow notifications in Android settings to enable local reminders.",
    );
  }

  await cancelLocalVaultReminders();
  let scheduled = 0;
  for (const product of products) {
    if (product.isArchived || scheduled >= MAX_REMINDERS) continue;
    const dateText = upcomingDate(product);
    if (!dateText) continue;
    for (const offsetDays of REMINDER_OFFSETS_DAYS) {
      if (scheduled >= MAX_REMINDERS) break;
      const trigger = scheduledDateFor(dateText, offsetDays);
      if (!trigger) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "TSVaultKeySafe reminder",
          body: "A private vault renewal, expiry, or warranty date is approaching. Unlock the vault to review it.",
          data: { kind: REMINDER_KIND, recordId: product.id, offsetDays },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger,
          channelId: REMINDER_CHANNEL_ID,
        },
      });
      scheduled += 1;
    }
  }
  return scheduled;
}

export async function getLocalVaultReminderCount(): Promise<number> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter(
    (notification) => notification.content.data?.kind === REMINDER_KIND,
  ).length;
}
