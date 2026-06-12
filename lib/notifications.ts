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
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const date = new Date();
  date.setMinutes(date.getMinutes() + 3);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "اختبار 3 دقائق",
      body: "إذا وصل هذا الإشعار فجدولة التاريخ تعمل بشكل صحيح.",
      sound: true,
    },
    trigger: date,
  });
}
