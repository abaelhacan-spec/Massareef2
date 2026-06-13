import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const alreadyScheduled = scheduled.some(
    (n) => n.identifier === "daily-reminder"
  );

  if (alreadyScheduled) return;

  await Notifications.scheduleNotificationAsync({
    identifier: "daily-reminder",
    content: {
      title: "تذكير 💰",
      body: "أخي، لا تنسَ تسجيل مصاريفك اليومية",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  });
}
