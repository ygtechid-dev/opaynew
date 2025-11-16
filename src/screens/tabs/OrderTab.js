import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TransactionTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transaksi</Text>
      <Text style={styles.desc}>Riwayat transaksi kamu akan tampil di sini.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700' },
  desc: { marginTop: 10, color: '#777' }
});
