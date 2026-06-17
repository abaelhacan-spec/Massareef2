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
      package: "com.hussein.masareef.dev",
      permissions: [
        "NOTIFICATIONS",
        "USE_BIOMETRIC",
        "USE_FINGERPRINT"
      ]
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
      ],
      "expo-local-authentication"
    ],

    experiments: {
      typedRoutes: true
    },

    extra: {
      eas: {
        projectId: "96e08c4c-bf3a-448f-b0a4-550ced30f786"
      }
    }
  }
};
