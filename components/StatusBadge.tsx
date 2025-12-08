// components/StatusBadge.tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { STATUS_COLORS } from '@/utils/constants';

type StatusType = 'em_preparo' | 'compostagem_ativa' | 'repouso' | 'pronta' | 'encerrada';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'medium',
  style,
}) => {
  const statusInfo = STATUS_COLORS[status];

  const sizeStyles = {
    small: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      fontSize: 11,
    },
    medium: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      fontSize: 12,
    },
    large: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      fontSize: 13,
    },
  };

  const selectedSize = sizeStyles[size];

  // Mapeamento de status para labels
  const statusLabels: Record<StatusType, string> = {
    em_preparo: 'Em Preparo',
    compostagem_ativa: 'Compostagem Ativa',
    repouso: 'Repouso',
    pronta: 'Pronta para Venda',
    encerrada: 'Encerrada',
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: statusInfo.background,
          paddingVertical: selectedSize.paddingVertical,
          paddingHorizontal: selectedSize.paddingHorizontal,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: statusInfo.text,
            fontSize: selectedSize.fontSize,
          },
        ]}
      >
        {statusLabels[status]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
});