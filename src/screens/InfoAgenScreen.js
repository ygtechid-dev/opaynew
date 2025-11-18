// screens/InfoPageScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { API_URL } from '../context/APIUrl';

export default function InfoPageScreen({ navigation, route }) {
  const { type, title } = route.params; // type: 'syarat-ketentuan', 'bantuan-dukungan', 'tentang-kami', 'kebijakan-privasi'
  
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/snk-agen/${type}?is_active=1`);
      
      if (response.data.status) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5DCBAD" />
        <Text style={styles.loadingText}>Memuat...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {data.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="document-text-outline" size={64} color="#C5C5C5" />
              <Text style={styles.emptyText}>Belum ada data</Text>
            </View>
          ) : (
            data.map((section, index) => (
              <View key={section.id} style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                
                {section.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.itemContainer}>
                    <View style={styles.bulletPoint} />
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}

                {index < data.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingTop: StatusBar.currentHeight || 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#999',
    marginTop: 10,
  },
  sectionContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#000',
    marginBottom: 12,
  },
  itemContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingRight: 10,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5DCBAD',
    marginTop: 7,
    marginRight: 10,
    flexShrink: 0,
  },
  itemText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    lineHeight: 20,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 15,
  },
});