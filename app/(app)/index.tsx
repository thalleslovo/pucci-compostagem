// app/(app)/index.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { authService } from '@/services/auth';

const PALETTE = {
  verdePrimario: '#5D7261',
  verdeClaro: '#F0F5F0',
  verdeClaro2: '#E8F0E8',
  verdeHover: '#4F6154',
  verdeSuave: '#7A8A7E',
  terracota: '#B16338',
  terracotaClaro: '#F5E8E0',
  branco: '#FFFFFF',
  preto: '#1A1A1A',
  cinza: '#666666',
  cinzaClaro: '#EEEEEE',
  cinzaClaro2: '#F5F5F5',
  erro: '#D32F2F',
  sucesso: '#4CAF50',
  warning: '#FF9800',
};

export default function DashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Desconectar',
      'Tem certeza que deseja sair do sistema?',
      [
        {
          text: 'Cancelar',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Sair',
          onPress: async () => {
            try {
              await authService.removePIN();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Erro', 'Erro ao desconectar');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={PALETTE.verdePrimario}
            title="Atualizando..."
            titleColor={PALETTE.verdePrimario}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>Bem-vindo 👋</Text>
            <Text style={styles.appTitle}>Campos Solo</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutIcon}>🚪</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            icon="🌾"
            title="Plantações"
            value="8"
            color={PALETTE.verdePrimario}
          />
          <StatCard
            icon="📊"
            title="Colheitas"
            value="12"
            color={PALETTE.terracota}
          />
          <StatCard
            icon="🌍"
            title="Área Total"
            value="45 ha"
            color={PALETTE.sucesso}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          <View style={styles.actionsGrid}>
            <ActionCard
              icon="🌱"
              title="Nova Plantação"
              onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
            />
            <ActionCard
              icon="📋"
              title="Registrar Colheita"
              onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
            />
            <ActionCard
              icon="📈"
              title="Relatórios"
              onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
            />
            <ActionCard
              icon="⚙️"
              title="Configurações"
              onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
            />
          </View>
        </View>

        {/* Recent Activities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Atividades Recentes</Text>
          <ActivityItem
            icon="🌾"
            title="Plantação de Milho"
            description="Quadra 3 - 5 hectares"
            date="Hoje, 14:30"
            status="ativa"
          />
          <ActivityItem
            icon="🚜"
            title="Colheita Concluída"
            description="Soja - Quadra 1"
            date="Ontem, 10:15"
            status="concluida"
          />
          <ActivityItem
            icon="💧"
            title="Irrigação Ativada"
            description="Sistema automatizado"
            date="2 dias atrás"
            status="ativa"
          />
        </View>

        {/* Info Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações do Solo</Text>

          <InfoCard
            title="Temperatura do Solo"
            value="28°C"
            subtitle="Ótima para plantação"
            icon="🌡️"
            color={PALETTE.sucesso}
          />

          <InfoCard
            title="Umidade do Solo"
            value="65%"
            subtitle="Nível adequado"
            icon="💧"
            color={PALETTE.verdePrimario}
          />

          <InfoCard
            title="pH do Solo"
            value="6.5"
            subtitle="Neutro"
            icon="⚗️"
            color={PALETTE.terracota}
          />
        </View>

        {/* Footer Info */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerTitle}>Última Sincronização</Text>
          <Text style={styles.footerTime}>Hoje, 15:45</Text>
          <Text style={styles.footerVersion}>v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Componente: Stat Card
interface StatCardProps {
  icon: string;
  title: string;
  value: string;
  color: string;
}

function StatCard({ icon, title, value, color }: StatCardProps) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );
}

// Componente: Action Card
interface ActionCardProps {
  icon: string;
  title: string;
  onPress: () => void;
}

function ActionCard({ icon, title, onPress }: ActionCardProps) {
  return (
    <TouchableOpacity
      style={styles.actionCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.actionIconBox}>
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

// Componente: Activity Item
interface ActivityItemProps {
  icon: string;
  title: string;
  description: string;
  date: string;
  status: 'ativa' | 'concluida' | 'pendente';
}

function ActivityItem({
  icon,
  title,
  description,
  date,
  status,
}: ActivityItemProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'ativa':
        return PALETTE.verdePrimario;
      case 'concluida':
        return PALETTE.sucesso;
      case 'pendente':
        return PALETTE.warning;
      default:
        return PALETTE.cinza;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'ativa':
        return 'Ativa';
      case 'concluida':
        return 'Concluída';
      case 'pendente':
        return 'Pendente';
      default:
        return '';
    }
  };

  return (
    <View style={styles.activityItem}>
      <Text style={styles.activityIcon}>{icon}</Text>
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityTitle}>{title}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor() },
            ]}
          >
            <Text style={styles.statusText}>{getStatusLabel()}</Text>
          </View>
        </View>
        <Text style={styles.activityDescription}>{description}</Text>
        <Text style={styles.activityDate}>{date}</Text>
      </View>
    </View>
  );
}

// Componente: Info Card
interface InfoCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
}

function InfoCard({ title, value, subtitle, icon, color }: InfoCardProps) {
  return (
    <View style={[styles.infoCard, { borderLeftColor: color }]}>
      <View style={styles.infoHeader}>
        <Text style={styles.infoIcon}>{icon}</Text>
        <View style={styles.infoTexts}>
          <Text style={styles.infoTitle}>{title}</Text>
          <Text style={styles.infoSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Text style={[styles.infoValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.verdeClaro,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },

  // ===== HEADER =====
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: PALETTE.branco,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.cinzaClaro2,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: PALETTE.cinza,
    fontWeight: '500',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: PALETTE.verdePrimario,
    marginTop: 4,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: PALETTE.cinzaClaro2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIcon: {
    fontSize: 20,
  },

  // ===== STATS =====
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.branco,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE.preto,
  },
  statTitle: {
    fontSize: 12,
    color: PALETTE.cinza,
    fontWeight: '500',
    marginTop: 2,
  },

  // ===== SECTIONS =====
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.preto,
    marginBottom: 12,
  },

  // ===== ACTIONS =====
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: PALETTE.branco,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: PALETTE.verdeClaro2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE.preto,
    textAlign: 'center',
  },

  // ===== ACTIVITIES =====
  activityItem: {
    flexDirection: 'row',
    backgroundColor: PALETTE.branco,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: PALETTE.verdePrimario,
  },
  activityIcon: {
    fontSize: 28,
    marginRight: 12,
    marginTop: 4,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PALETTE.preto,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE.branco,
  },
  activityDescription: {
    fontSize: 12,
    color: PALETTE.cinza,
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 11,
    color: PALETTE.cinzaClaro,
    fontWeight: '500',
  },

  // ===== INFO CARDS =====
  infoCard: {
    backgroundColor: PALETTE.branco,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  infoTexts: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: PALETTE.preto,
  },
  infoSubtitle: {
    fontSize: 11,
    color: PALETTE.cinza,
    marginTop: 2,
  },
  infoValue: {
    fontSize: 26,
    fontWeight: '800',
  },

  // ===== FOOTER =====
  footerInfo: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: PALETTE.cinzaClaro,
  },
  footerTitle: {
    fontSize: 12,
    color: PALETTE.cinza,
    fontWeight: '500',
    marginBottom: 4,
  },
  footerTime: {
    fontSize: 14,
    color: PALETTE.verdePrimario,
    fontWeight: '600',
    marginBottom: 6,
  },
  footerVersion: {
    fontSize: 11,
    color: PALETTE.cinza,
    opacity: 0.6,
  },
});