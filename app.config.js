module.exports = {
  expo: {
    name: "مصاريف",
    slug: "msaryf-",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "expense-tracker",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#0B1120"
    },

    ios: {
      supportsTablet: false
    },

    android: {
      package: "com.hussein.masareef",
      permissions: ["NOTIFICATIONS"]
    },

    web: {
      favicon: "./assets/images/icon.png"
    },

    plugins: [
      ["expo-router", { origin: "https://replit.com/" }],
      "expo-font",
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#0B1120",
          defaultChannel: "default"
        }
      ]
    ],

    experiments: {
      typedRoutes: true
    },

    extra: {
      eas: {
        projectId: "ddd00f3b-780e-491d-a8c7-5968371dad0b"
      }
    }
  }
};
