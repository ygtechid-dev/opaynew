import React, { useEffect } from 'react';
import AppNavigator from './screens/navigation/AppNavigator';
import { setDefaultFont } from './utils/DefaultFont';


export default function App() {
   useEffect(() => {
    setDefaultFont('PlusJakartaSans-Regular');
  }, []);
  return <AppNavigator />;
}
