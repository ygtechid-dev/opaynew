import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/FontAwesome5';

import SplashScreen from '../SplashScreen';
import OnboardingScreen from '../OnboardingScreen';
import LoginScreen from '../LoginScreen';
import OtpScreen from '../OtpScreen';
import RegisterScreen from '../RegisterScreen';
import LocationAccessScreen from '../LocationAccessScreen';
import DashboardPPOB from '../DashboardPPOB';

import HomeTab from '../tabs/HomeTab';
import MessageTab from '../tabs/MessageTab';
import OrderTab from '../tabs/OrderTab';
import ActivityTab from '../tabs/ActivityTab';
import ProfileTab from '../tabs/ProfileTab';
import PulsaDataPage from '../tabs/PulsaDataPage';


// Import SVG hanya untuk Order tab (icon tengah)
import OrderIcon from '../../assets/tab-order.svg';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Custom Tab Bar Button untuk icon tengah yang menonjol
const CustomTabBarButton = ({ children, onPress }) => (
  <TouchableOpacity
    style={styles.customButtonContainer}
    onPress={onPress}
  >
    <View style={styles.customButton}>
      {children}
    </View>
  </TouchableOpacity>
);

// ---------- BOTTOM TABS ----------
function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
        tabBarIconStyle: styles.tabIcon,
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeTab} 
        options={{ 
          title: "Beranda",
          tabBarIcon: ({ focused, color }) => (
            <Icon name="home" size={22} color={color} solid />
          ),
        }} 
      />

      <Tab.Screen 
        name="MessageTab" 
        component={MessageTab} 
        options={{ 
          title: "Pesan",
          tabBarIcon: ({ focused, color }) => (
            <Icon name="comment-dots" size={20} color={color} solid={focused} />
          ),
        }} 
      />

      <Tab.Screen 
        name="OrderTab" 
        component={OrderTab} 
        options={{ 
          title: "",
          tabBarIcon: ({ focused }) => (
            <OrderIcon width={28} height={28} style={{marginTop: 12}} fill="#FFFFFF" />
          ),
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        }} 
      />

      <Tab.Screen 
        name="ActivityTab" 
        component={ActivityTab} 
        options={{ 
          title: "Aktivitas",
          tabBarIcon: ({ focused, color }) => (
            <Icon name="chart-line" size={20} color={color} solid />
          ),
        }} 
      />

      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileTab} 
        options={{ 
          title: "Akun",
          tabBarIcon: ({ focused, color }) => (
            <Icon name="user" size={20} color={color} solid />
          ),
        }} 
      />
    </Tab.Navigator>
  );
}

// ---------- MAIN ROUTER ----------
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
        <Stack.Screen name="OtpScreen" component={OtpScreen} />
        <Stack.Screen name="LocationAccessScreen" component={LocationAccessScreen} />
        <Stack.Screen name="DashboardPPOB" component={DashboardPPOB} />
        <Stack.Screen name="PulsaDataPage" component={PulsaDataPage} />


        {/* HOME SEKARANG PAKAI BOTTOM TABS */}
        <Stack.Screen name="Home" component={BottomTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 65,
    paddingBottom: 8,
    paddingTop: 3,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    marginTop: 5, // Jarak 5px antara icon dan title
  },
  tabIcon: {
    marginBottom: 0,
  },
  customButtonContainer: {
    top: -30,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    height: 70,
    borderRadius: 45,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  customButton: {
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    paddingTop: 10
  },
});