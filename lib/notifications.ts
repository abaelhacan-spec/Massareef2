import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const NOTIFICATION_ID = "daily-expense-reminder";

export async function initNotifications(): Promise<void> {
  if (Platform.OS === "web") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "تذكيرات المصاريف",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } =
      await Notifications.requestPermissionsAsync();

    finalStatus = status;
  }

  if (finalStatus !== "granted") return;

  await Notifications
    .cancelScheduledNotificationAsync(NOTIFICATION_ID)
    .catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: "تذكير بالمصاريف",
      body: "لا تنس تسجيل مصروفات اليوم.",
      sound: true,
    },
    trigger: {
      hour: 21,
      minute: 0,
      repeats: true,
    },
  });
}
