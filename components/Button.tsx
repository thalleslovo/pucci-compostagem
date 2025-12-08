// components/Button.tsx

import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '@/utils/constants';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  size = 'medium',
  fullWidth = false,
}) => {
  const variantColors = {
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    danger: COLORS.danger,
    success: COLORS.success,
  };

  const sizeStyles = {
    small: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      fontSize: 12,
    },
    medium: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      fontSize: 14,
    },
    large: {
      paddingVertical: 16,
      paddingHorizontal: 32,
      fontSize: 16,
    },
  };

  const selectedSize = sizeStyles[size];
  const backgroundColor = variantColors[variant];
  const isDisabled = disabled || loading;
  const textColor = variant === 'secondary' ? COLORS.text : COLORS.white;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isDisabled ? COLORS.disabled : backgroundColor,
          opacity: pressed && !isDisabled ? 0.8 : 1,
          paddingVertical: selectedSize.paddingVertical,
          paddingHorizontal: selectedSize.paddingHorizontal,
          width: fullWidth ? '100%' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: isDisabled ? COLORS.gray : textColor,
              fontSize: selectedSize.fontSize,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  text: {
    fontWeight: '600',
  },
});