import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Switch,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../../context/APIUrl';

export default function ProfileTab({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidikJariActive, setSidikJariActive] = useState(false);
  const [saldoShow, setSaldoShow] = useState(false); // ✅ State untuk show/hide saldo

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const userJson = await AsyncStorage.getItem('userData');
      
      if (userJson) {
        const userObj = JSON.parse(userJson);
        
        // Fetch latest data from API
        const response = await axios.get(`${API_URL}/api/users/${userObj.id}`);
        
        if (response.data) {
          setUserData(response.data.data);
          await AsyncStorage.setItem('userData', JSON.stringify(response.data.data));
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Gagal memuat data user');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'xx,xxx,xxx';
    const numAmount = parseFloat(amount);
    return numAmount.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const handleLogout = async () => {
    Alert.alert(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin keluar?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userData');
              await AsyncStorage.removeItem('userToken');
              navigation.replace('Login');
            } catch (error) {
              console.error('Error logout:', error);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Memuat...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Akun</Text>
        </View>

        {/* Profile Info */}
        <View style={styles.profileContainer}>
          <View style={styles.avatarContainer}>
            {userData?.image ? (
              <Image source={{ uri: API_URL + userData.image }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="person" size={50} color="#C5C5C5" />
              </View>
            )}
          </View>

          <Text style={styles.userName}>
            {userData?.f_name || ''} {userData?.l_name || ''}
          </Text>
          <Text style={styles.memberType}>Basic Member</Text>
        </View>

        {/* Saldo Card */}
        <View style={styles.saldoCard}>
          <View style={styles.saldoLeft}>
            <Icon name="wallet" size={32} color="#5DCBAD" />
            <View style={styles.saldoInfo}>
              {/* ✅ Saldo Label dengan Icon Toggle */}
              <View style={styles.saldoLabelContainer}>
                <Text style={styles.saldoLabel}>Saldo</Text>
                {saldoShow ? (
                  <TouchableOpacity onPress={() => setSaldoShow(false)}>
                    <Image 
                      source={require('../../assets/saldoshow.png')} 
                      style={styles.saldoIcon} 
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setSaldoShow(true)}>
                    <Image 
                      source={require('../../assets/invisible.png')} 
                      style={styles.saldoIcon} 
                    />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* ✅ Saldo Amount dengan Show/Hide */}
              <Text style={styles.saldoAmount}>
                {saldoShow 
                  ? `Rp ${formatCurrency(userData?.wallet_balance)}` 
                  : 'Rp •••••••'
                }
              </Text>
            </View>
          </View>
          
          <View style={styles.saldoActions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.push('TopUpPage')}>
              <Icon name="add-circle" size={24} color="#5DCBAD" />
              <Text style={styles.actionText}>Isi Saldo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.push('TopUpHistoryPage')}>
              <Icon name="time" size={24} color="#5DCBAD" />
              <Text style={styles.actionText}>Riwayat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pengaturan Akun */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pengaturan Akun</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EditProfileScreen', { userData })}>
              <Icon name="create-outline" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.menuList}>
            <View style={styles.menuItem}>
              <Icon name="call-outline" size={24} color="#666" />
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>No. Telepon</Text>
                <Text style={styles.menuValue}>{userData?.phone || '-'}</Text>
              </View>
            </View>

            <View style={styles.menuItem}>
              <Icon name="mail-outline" size={24} color="#666" />
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Email</Text>
                <Text style={styles.menuValue}>{userData?.email || '-'}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() =>   navigation.navigate('RequestHapusAkunScreen', {
            userData: userData,
            onRequestSuccess: handleLogout
          })}
            >
              
              <Icon name="person-remove-outline" size={24} color="#666" />
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Hapus Akun</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#C5C5C5" />
            </TouchableOpacity>

            <View style={styles.menuItem}>
              <Icon name="finger-print-outline" size={24} color="#666" />
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Sidik Jari</Text>
                <Text style={styles.menuSubLabel}>Aktif</Text>
              </View>
              <Switch
                value={sidikJariActive}
                onValueChange={setSidikJariActive}
                trackColor={{ false: '#D9D9D9', true: '#5DCBAD' }}
                thumbColor="#FFF"
              />
            </View>
          </View>
        </View>
        
       {/* Menu Lainnya */}
<View style={styles.section}>
  <TouchableOpacity 
    style={styles.menuItemSimple}
    onPress={() => navigation.navigate('InfoPageScreen', {
      type: 'tentang-kami',
      title: 'Tentang Kami'
    })}
  >
    <Icon name="information-circle-outline" size={24} color="#666" />
    <Text style={styles.menuLabelSimple}>Tentang kami</Text>
    <Icon name="chevron-forward" size={20} color="#C5C5C5" />
  </TouchableOpacity>

  <TouchableOpacity 
    style={styles.menuItemSimple}
    onPress={() => navigation.navigate('InfoPageScreen', {
      type: 'bantuan-dukungan',
      title: 'Bantuan & Dukungan'
    })}
  >
    <Icon name="help-circle-outline" size={24} color="#666" />
    <Text style={styles.menuLabelSimple}>Bantuan & Dukungan</Text>
    <Icon name="chevron-forward" size={20} color="#C5C5C5" />
  </TouchableOpacity>

  <TouchableOpacity 
    style={styles.menuItemSimple}
    onPress={() => navigation.navigate('InfoPageScreen', {
      type: 'syarat-ketentuan',
      title: 'Syarat & Ketentuan'
    })}
  >
    <Icon name="document-text-outline" size={24} color="#666" />
    <Text style={styles.menuLabelSimple}>Syarat & Ketentuan</Text>
    <Icon name="chevron-forward" size={20} color="#C5C5C5" />
  </TouchableOpacity>

  <TouchableOpacity 
    style={styles.menuItemSimple}
    onPress={() => navigation.navigate('InfoPageScreen', {
      type: 'kebijakan-privasi',
      title: 'Kebijakan Privasi'
    })}
  >
    <Icon name="shield-checkmark-outline" size={24} color="#666" />
    <Text style={styles.menuLabelSimple}>Kebijakan Privasi</Text>
    <Icon name="chevron-forward" size={20} color="#C5C5C5" />
  </TouchableOpacity>
</View>


        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="power" size={20} color="#FF4444" />
          <Text style={styles.logoutText}>Keluar</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#F9F9F9',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    color: '#000',
  },
  profileContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#000',
    marginBottom: 5,
  },
  memberType: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#999',
  },
  saldoCard: {
    backgroundColor: '#E8F5F2',
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  saldoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  saldoInfo: {
    marginLeft: 12,
    flex: 1, // ✅ Tambahkan ini
  },
  // ✅ Style baru untuk container label + icon
  saldoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saldoLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#000',
  },
  // ✅ Style untuk icon show/hide
  saldoIcon: {
    width: 14,
    height: 14,
    tintColor: '#666', // Optional: beri warna
  },
  saldoAmount: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#000',
    marginTop: 2, // ✅ Tambahkan spacing
  },
  saldoActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 0.48,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#5DCBAD',
    marginLeft: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#000',
  },
  menuList: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuContent: {
    flex: 1,
    marginLeft: 15,
  },
  menuLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#000',
  },
  menuValue: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginTop: 2,
  },
  menuSubLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  menuItemSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  menuLabelSimple: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#000',
    marginLeft: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  logoutText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#FF4444',
    marginLeft: 8,
  },
});