import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function initNotifications(): Promise<void> {
  if (Platform.OS === "web") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "تذكيرات المصاريف",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#7C3AED",
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

  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "تذكير",
      body: "لا تنس إضافة مصاريف اليوم",
      sound: true,
    },
    trigger: {
      hour: 21,
      minute: 0,
      repeats: true,
    },
  });
}
