// =========================
// TOPUP HISTORY PAGE FINAL
// WITH AGEN UPGRADE HISTORY
// =========================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';

const API_TOPUP = 'https://api.ditokoku.id/api/tripay/topup';
const API_UPGRADE = 'https://api.ditokoku.id/api/users/agen';
const API_CONFIG = 'https://api.ditokoku.id/api/config-price';

const PAGE_LIMIT = 10;

export default function TopupHistoryPage({ navigation }) {
  const [topups, setTopups] = useState([]);
  const [filteredTopups, setFilteredTopups] = useState([]);

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Semua');

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTopup, setSelectedTopup] = useState(null);

  const [upgradeAmount, setUpgradeAmount] = useState(0);

  const statusOptions = ['Semua', 'PAID', 'UNPAID', 'FAILED', 'EXPIRED'];

  useEffect(() => {
    loadTopups(true);
  }, []);

  const loadTopups = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setLoading(true);
        setPage(1);
        setHasMore(true);
      }

      const userJson = await AsyncStorage.getItem('userData');
      if (!userJson) return;

      const userObj = JSON.parse(userJson);
      const userId = userObj.id;

      // =============================
      // FETCH TOPUP TRIPAY
      // =============================
      const response = await axios.get(
        `${API_TOPUP}?page=${isRefresh ? 1 : page}&limit=${PAGE_LIMIT}&user_id=${userId}`,
      );

      let topUpData = response.data?.data || [];
      const filtering = topUpData.filter((e) => e.customer_phone == userObj.phone);

      // =============================
      // FETCH UPGRADE HANYA SAAT REFRESH
      // =============================
      let userUpgrades = [];
      
      if (isRefresh) {
        // Fetch config price
        const configRes = await axios.get(API_CONFIG);
        const upgradePrice = configRes.data?.success === true && configRes.data?.data
          ? parseFloat(configRes.data.data.min_topup).toFixed(0)
          : 0;
        
        setUpgradeAmount(upgradePrice);

        // Fetch upgrade agen
        const agenRes = await axios.get(API_UPGRADE);
        const agenList = agenRes.data?.data || [];

        console.log('itemee', agenList.filter((item) => item.user_id == userId));
        
        userUpgrades = agenList
          .filter((item) => item.user_id == userId)
          .slice(0, 1) // ✅ HANYA AMBIL 1 DATA UPGRADE TERBARU
          .map((item) => ({
            id: `UP-${item.id}`,
            reference: `AG-${item.id}`,
            amount: upgradePrice, // ✅ GUNAKAN AMOUNT DARI CONFIG
            status: "PAID",
            created_at: item.created_at,
            merchant_ref: "-",
            customer_name: `${item.f_name} ${item.l_name}`,
            customer_email: "-",
            customer_phone: item.phone,
            isUpgrade: true,
            title: `Upgrade Agen (${item.nama_konter})`,
          }));
      }

      // =============================
      // COMBINE TOPUP + UPGRADE
      // =============================
      let combined;
      
      if (isRefresh) {
        // Saat refresh, gabung topup + upgrade
        combined = [...filtering, ...userUpgrades].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setTopups(combined);
      } else {
        // Saat load more, hanya tambahkan topup baru (tanpa upgrade)
        setTopups((prev) => {
          const newData = [...prev, ...filtering];
          // Sort ulang
          return newData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        });
      }

      setHasMore(response.data.pagination?.hasNextPage || false);
      setPage((prev) => prev + 1);

      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);

      filterData(search, selectedStatus);
    } catch (err) {
      console.log("❌ Error:", err.message);
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTopups(true);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      loadTopups(false);
    }
  };

  const filterData = (searchValue, statusValue) => {
    let data = [...topups];

    if (statusValue !== 'Semua') {
      data = data.filter(item => item.status === statusValue);
    }

    if (searchValue.trim() !== '') {
      data = data.filter(item =>
        item.reference?.toLowerCase().includes(searchValue.toLowerCase()) ||
        item.customer_name?.toLowerCase().includes(searchValue.toLowerCase())
      );
    }

    setFilteredTopups(data);
  };

  useEffect(() => {
    filterData(search, selectedStatus);
  }, [search, selectedStatus, topups]);

  const formatCurrency = num => {
    const number = parseFloat(num);
    return number.toLocaleString('id-ID');
  };

  const formatDate = dateString => {
    const d = new Date(dateString);
    return d.toLocaleString('id-ID', { hour12: false });
  };

  const getStatusColor = status => {
    switch (status) {
      case 'PAID': return '#10B981';
      case 'UNPAID': return '#F59E0B';
      case 'FAILED': return '#EF4444';
      case 'EXPIRED': return '#6B7280';
      default: return '#9CA3AF';
    }
  };

  const renderItem = ({ item }) => {
    const color = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setSelectedTopup(item);
          setDetailModalVisible(true);
        }}
      >
        <View style={styles.row}>
          <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
            <Icon name={item.isUpgrade ? "trending-up-outline" : "wallet"} size={24} color={color} />
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.title}>
              {item.isUpgrade ? item.title : "Top-Up Saldo"}
            </Text>

            <Text style={styles.refText}>Ref: {item.reference}</Text>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>

            <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
              <Icon name="ellipse" size={10} color={color} />
              <Text style={[styles.statusText, { color }]}>{item.status}</Text>
            </View>
          </View>

          <Text style={[styles.amount, { color }]}>
            Rp {formatCurrency(item.amount)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedTopup) return null;

    const color = getStatusColor(selectedTopup.status);

    return (
      <Modal visible={detailModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedTopup.isUpgrade ? "Detail Upgrade Agen" : "Detail Top-Up"}
              </Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Icon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Reference</Text>
              <Text style={styles.modalValue}>{selectedTopup.reference}</Text>

              <Text style={styles.modalLabel}>Nama</Text>
              <Text style={styles.modalValue}>{selectedTopup.customer_name}</Text>

              <Text style={styles.modalLabel}>No. HP</Text>
              <Text style={styles.modalValue}>{selectedTopup.customer_phone}</Text>

              <Text style={styles.modalLabel}>Jumlah</Text>
              <Text style={[styles.modalValue, { color }]}>
                Rp {formatCurrency(selectedTopup.amount)}
              </Text>

              <Text style={styles.modalLabel}>Status</Text>
              <Text style={[styles.modalValue, { color }]}>
                {selectedTopup.status}
              </Text>

              <Text style={styles.modalLabel}>Waktu</Text>
              <Text style={styles.modalValue}>
                {formatDate(selectedTopup.created_at)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDetailModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Tutup</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Riwayat Top-Up</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* SEARCH */}
      <View style={styles.searchBox}>
        <Icon name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari reference..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* LIST */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#52d0af" />
        </View>
      ) : (
        <FlatList
          data={filteredTopups}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color="#52d0af" />
            ) : null
          }
        />
      )}

      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F6F6' },

  header: {
    backgroundColor: '#52d0af',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },

  searchBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#000',
  },

  card: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },

  row: { flexDirection: 'row', alignItems: 'center', flex: 1 },

  iconContainer: {
    width: 45, height: 45, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },

  cardContent: { flex: 1 },

  title: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#000',
  },

  refText: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  dateText: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },

  statusText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },

  amount: { fontFamily: 'Poppins-Bold', fontSize: 15 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },

  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16,
  },

  modalTitle: {
    fontSize: 16, fontWeight: 'bold', fontFamily: 'Poppins-Bold',
  },

  modalBody: { marginBottom: 20 },

  modalLabel: {
    color: '#6B7280',
    marginTop: 10,
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
  },

  modalValue: {
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },

  closeButton: {
    backgroundColor: '#52d0af',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  closeButtonText: {
    color: '#FFF', fontWeight: 'bold', fontFamily: 'Poppins-Bold', fontSize: 15,
  },
});