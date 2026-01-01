import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../context/APIUrl';

const MINT = '#5DCBAD';

export default function ActivityTab({ navigation }) {
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadActivities();
  }, []);

  const getStatusColor = (status) => {
    if (!status) return '#000';

    const s = status.toLowerCase();

    if (s.includes('sukses') || s.includes('success')) return '#5DCBAD'; // Hijau
    if (s.includes('pending') || s.includes('process')) return '#FBBF24'; // Kuning

    return '#EF4444'; // Merah
  };

  const loadActivities = async () => {
    try {
      setIsLoading(true);

      const userJson = await AsyncStorage.getItem('userData');
      if (!userJson) return setIsLoading(false);

      const userObj = JSON.parse(userJson);
      const userId = userObj.id;

      let userTopUps = [];
      let userTripay = [];
      let userUpgrades = [];
      let userPPOB = [];

      // Tripay Topup
      try {
        const res = await axios.get(`${API_URL}/api/tripay/topup`);
        const list = res.data?.data || [];

        userTripay = list
          .filter((item) => item.customer_phone == userObj.phone)
          .map((item) => ({
            id: `tripay-${item.id}`,
            type: 'tripay_topup',
            title: 'Top Up via Tripay',
            amount: Number(item.amount),
            status: item.payment_status,
            date: item.created_at,
            paymentMethod: item.payment_method || 'Tripay',
            reference: item.reference,
          }));
      } catch (err) {}

      // Upgrade Agen
      try {
        const res = await axios.get(`https://api.ditokoku.id/api/users/agen`);
        const list = res.data?.data || [];

        userUpgrades = list
          .filter((item) => item.user_id == userId)
          .map((item) => ({
            id: `upgrade-${item.id}`,
            type: 'upgrade',
            title: `Upgrade Agen Platinum`,
            amount: 1000,
            status: 'success',
            date: item.created_at,
            paymentMethod: 'Upgrade Agen',
            reference: `AG-${item.id}`,
          }));
      } catch (err) {}

      // PPOB
      try {
        const ppob = await axios.get(`${API_URL}/api/order-transaction`);
        const list = ppob.data?.data || [];

        userPPOB = list
          .filter((item) => item.user?.id == userId)
          .map((item) => ({
            id: `ppob-${item.id}`,
            type: 'ppob',
            title: item.product?.name || 'Transaksi PPOB',
            amount: parseFloat(item.ppob_details?.price || 0),
            status: item.status,
            date: item.created_at,
            customerNo: item.customer_no,
            category: item.product?.category,
            reference: item.ref_id,
          }));
      } catch (err) {}

      const combined = [...userTopUps, ...userTripay, ...userUpgrades, ...userPPOB]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setActivities(combined);
      setIsLoading(false);
      setRefreshing(false);
    } catch (err) {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadActivities();
  };

  const formatCurrency = (amount) => {
    return amount?.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}, ${date
      .getHours()
      .toString()
      .padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
  };

  const ItemDetail = ({ label, value }) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: '#888', fontSize: 12, fontFamily: 'Poppins-Regular' }}>{label}</Text>
      <Text style={{ color: '#000', fontSize: 15, fontFamily: 'Poppins-Medium' }}>{value}</Text>
    </View>
  );

  const renderActivityItem = (item) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedActivity(item);
          setShowModal(true);
        }}
      >
        <View style={styles.row}>
          <View style={styles.iconBox}>
            <Icon name="receipt-outline" size={24} color={MINT} />
          </View>

          <View style={styles.flex1}>
            <Text style={styles.title}>{item.title}</Text>

            <Text style={styles.subtitle}>
              {item.customerNo ? `${item.category} • ${item.customerNo}` : item.paymentMethod}
            </Text>

            <View style={styles.rowBetween}>
              <Text style={styles.date}>{formatDate(item.date)}</Text>

              <Text style={[styles.amount, { color: getStatusColor(item.status) }]}>
                {item.type === 'ppob' ? '-' : '+'}Rp{formatCurrency(item.amount)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <View style={styles.container}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Aktivitas</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* SEARCH */}
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color="#A5A5A5" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari aktivitas..."
            placeholderTextColor="#A5A5A5"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* LIST */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={MINT} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {activities.map((item) => renderActivityItem(item))}

            {activities.length === 0 && (
              <View style={styles.emptyContainer}>
                <Icon name="file-tray-outline" size={60} color="#BDBDBD" />
                <Text style={styles.emptyTitle}>Belum ada aktivitas</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* DETAIL MODAL */}
      {selectedActivity && (
        <Modal
          visible={showModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detail Aktivitas</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Icon name="close" size={26} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                <ItemDetail label="Judul" value={selectedActivity.title} />
                <ItemDetail label="Nominal" value={`Rp ${formatCurrency(selectedActivity.amount)}`} />

                <ItemDetail
                  label="Status"
                  value={
                    <Text style={{ color: getStatusColor(selectedActivity.status), fontFamily: 'Poppins-Medium' }}>
                      {selectedActivity.status?.toUpperCase()}
                    </Text>
                  }
                />

                <ItemDetail label="Referensi" value={selectedActivity.reference || '-'} />
                <ItemDetail label="Tanggal" value={formatDate(selectedActivity.date)} />
                <ItemDetail label="Metode" value={selectedActivity.paymentMethod || '-'} />
                <ItemDetail label="Customer No" value={selectedActivity.customerNo || '-'} />
                <ItemDetail label="Kategori" value={selectedActivity.category || '-'} />
              </ScrollView>

            </View>
          </View>
        </Modal>
      )}

    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9', paddingTop: 40 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12,
  },

  headerTitle: {
    fontSize: 20, fontFamily: 'Poppins-Medium', color: '#000',
  },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', margin: 20,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 12, elevation: 2,
  },

  searchInput: {
    flex: 1, marginHorizontal: 10,
    fontFamily: 'Poppins-Regular', color: '#000',
  },

  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 1,
  },

  row: { flexDirection: 'row', alignItems: 'center' },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  flex1: { flex: 1 },

  iconBox: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
    backgroundColor: MINT + '20',
  },

  title: { fontFamily: 'Poppins-SemiBold', fontSize: 14, color: '#000' },

  subtitle: {
    fontFamily: 'Poppins-Regular', fontSize: 12, color: '#6B7280',
    marginTop: 3, marginBottom: 6,
  },

  date: { fontFamily: 'Poppins-Regular', fontSize: 11, color: '#8F8F8F' },

  amount: { fontFamily: 'Poppins-Bold', fontSize: 15 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyContainer: { alignItems: 'center', marginTop: 80 },

  emptyTitle: { marginTop: 10, color: '#9CA3AF', fontFamily: 'Poppins-Regular' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },

  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    overflow: 'hidden',
  },

  modalHeader: {
    backgroundColor: MINT,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalTitle: {
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    fontSize: 18,
  },

  modalContent: {
    padding: 20,
  },
});
