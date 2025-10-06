import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.journeysync.mobile',
  appName: 'Journey Sync',
  webDir: 'dist',
  server: {
    cleartext: true
  },
  plugins: {
    GoogleMaps: {
      apiKey: process.env.REACT_APP_GOOGLE_MAPS_WEB_API_KEY
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e40af',
      showSpinner: false
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#ffffff'
    }
  }
};

export default config;