import React, { useEffect } from 'react';
import AppNavigator from './screens/navigation/AppNavigator';
import { setDefaultFont } from './utils/DefaultFont';
import { OneSignal, LogLevel } from 'react-native-onesignal';

// Enable verbose logging untuk debugging
OneSignal.Debug.setLogLevel(LogLevel.Verbose);

// Initialize dengan OneSignal App ID
OneSignal.initialize('d284318e-d3a9-4cb0-aa02-834f56a53831');

// Request permission untuk push notifications
OneSignal.Notifications.requestPermission(true);

export default function App() {
  useEffect(() => {
    setDefaultFont('PlusJakartaSans-Regular');
  }, []);

 

  return <AppNavigator />;
}