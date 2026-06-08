import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyDH4GvbdtPqJwUlnRDqtOUoofkL4PTXiew",
  authDomain: "vehigest-ar.firebaseapp.com",
  projectId: "vehigest-ar",
  storageBucket: "vehigest-ar.firebasestorage.app",
  messagingSenderId: "150404378851",
  appId: "1:150404378851:web:940ba835e20c4edeb215d6"
};

initializeApp(firebaseConfig);

import DashboardScreen from './screens/DashboardScreen';
import VehiclesScreen from './screens/VehiclesScreen';
import AlertsScreen from './screens/AlertsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#161A22' },
          headerTintColor: '#F0F2F5',
          tabBarStyle: { backgroundColor: '#161A22', borderTopColor: '#2A3040' },
          tabBarActiveTintColor: '#E8A020',
          tabBarInactiveTintColor: '#7A8499',
        }}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Dashboard', title: 'VehiGest AR' }} />
        <Tab.Screen name="Vehicles" component={VehiclesScreen} options={{ tabBarLabel: 'Vehículos', title: 'Vehículos' }} />
        <Tab.Screen name="Alerts" component={AlertsScreen} options={{ tabBarLabel: 'Alertas', title: 'Alertas' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
