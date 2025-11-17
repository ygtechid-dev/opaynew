import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function ActivityTab({ navigation }) {
  const [searchText, setSearchText] = useState('');

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Aktivitas</Text>
          <TouchableOpacity style={styles.historyButton}>
            <Icon name="time-outline" size={28} color="#5DCBAD" />
          </TouchableOpacity>
        </View>

        {/* Search Box */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Tampilan Produk"
            placeholderTextColor="#C5C5C5"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Pesan Lagi Button */}
        <TouchableOpacity style={styles.pesanLagiButton}>
          <Text style={styles.pesanLagiText}>Pesan Lagi</Text>
          <Icon name="arrow-forward" size={20} color="#5DCBAD" />
        </TouchableOpacity>

        {/* Empty State */}
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Add your activity content here when there's data */}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F9F9F9',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Medium',
    color: '#000',
    flex: 1,
    textAlign: 'left',
    marginLeft: 10,
  },
  historyButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#000',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  pesanLagiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  pesanLagiText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#5DCBAD',
    marginRight: 5,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
});