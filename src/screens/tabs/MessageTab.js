import AsyncStorage from '@react-native-async-storage/async-storage';
import { TabRouter } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function MessageTab({ navigation, route }) {
const { tabaktif } = route.params || {};
  console.log('====================================');
  console.log('tabal', tabaktif);
  console.log('====================================');
  const [activeTab, setActiveTab] = useState(tabaktif ? tabaktif : 'chat');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);

  // =============================
  // 🔥 Fetch Notification Logs
  // =============================
  const getNotifications = async () => {
    try {
      setLoading(true);
       const userData = await AsyncStorage.getItem('userData');


       if(userData) {
        const userObj = JSON.parse(userData);
        console.log('userobj',userObj);
        
  const response = await fetch(
      `https://api.ditokoku.id/api/notifications?user_id=${userObj.id}&limit=50`
      );

      const json = await response.json();

      if (json.success) {
        setNotifications(json.data);
      } else {
        setNotifications([]);
      }
       }
      

    
    } catch (error) {
      console.error('❌ Error get notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "notifikasi") {
      getNotifications();
    }
  }, [activeTab]);

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pesan</Text>
          <View style={styles.placeholder} />
        </View>

        {/* TAB */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
            onPress={() => setActiveTab('chat')}
          >
            <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
              Chat
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'notifikasi' && styles.tabActive]}
            onPress={() => setActiveTab('notifikasi')}
          >
            <Text style={[styles.tabText, activeTab === 'notifikasi' && styles.tabTextActive]}>
              Notifikasi
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'berita' && styles.tabActive]}
            onPress={() => setActiveTab('berita')}
          >
            <Text style={[styles.tabText, activeTab === 'berita' && styles.tabTextActive]}>
              Berita
            </Text>
          </TouchableOpacity>
        </View>

        {/* CONTENT */}
        {activeTab === "notifikasi" ? (
          <>
            {/* LOADING */}
            {loading && (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#5DCBAD" />
              </View>
            )}

            {/* LIST NOTIF */}
            {!loading && notifications.length > 0 && (
              <ScrollView style={{ paddingHorizontal: 20 }}>
                {notifications.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.notifCard}
                    onPress={() => setSelectedNotif(item)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={styles.notifIcon}>
                        <Icon name="notifications" size={20} color="#FFF" />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.notifTitle}>{item.title}</Text>
                        <Text style={styles.notifMessage} numberOfLines={2}>
                          {item.message}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.notifTime}>
                      {new Date(item.sent_at).toLocaleString('id-ID')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* EMPTY */}
            {!loading && notifications.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Belum ada notifikasi</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Belum ada {activeTab}</Text>
          </View>
        )}

        {/* ===============================
            🔥 MODAL DETAIL NOTIFICATION
        ================================ */}
        <Modal
          animationType="slide"
          transparent
          visible={selectedNotif !== null}
          onRequestClose={() => setSelectedNotif(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>{selectedNotif?.title}</Text>
              <Text style={styles.modalMessage}>{selectedNotif?.message}</Text>

              <Text style={styles.modalTime}>
                {selectedNotif && new Date(selectedNotif.sent_at).toLocaleString('id-ID')}
              </Text>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedNotif(null)}
              >
                <Text style={styles.modalCloseText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: { width: 40 },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Medium',
    color: '#000',
    flex: 1,
    marginLeft: 10,
  },
  placeholder: { width: 40 },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#FFF',
    borderRadius: 25,
    padding: 5,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  tabActive: { backgroundColor: '#5DCBAD' },
  tabText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#5DCBAD',
  },
  tabTextActive: {
    color: '#FFF',
    fontFamily: 'Poppins-Medium',
  },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#C5C5C5',
  },

  // Notification list
  notifCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    marginTop: 20
  },
  notifIcon: {
    width: 35,
    height: 35,
    backgroundColor: '#5DCBAD',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#000',
  },
  notifMessage: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
  },
  notifTime: {
    marginTop: 6,
    fontSize: 11,
    color: '#999',
    fontFamily: 'Poppins-Regular',
    textAlign: 'right',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Medium',
    color: '#000',
  },
  modalMessage: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#444',
  },
  modalTime: {
    marginTop: 15,
    fontSize: 12,
    color: '#888',
  },
  modalCloseBtn: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: '#5DCBAD',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    fontFamily: 'Poppins-Medium',
    color: '#FFF',
    fontSize: 14,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
