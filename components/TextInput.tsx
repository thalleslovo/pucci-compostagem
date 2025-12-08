// components/TextInput.tsx

import React from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { COLORS } from '@/utils/constants';

interface CustomTextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  helperText?: string;
  required?: boolean;
  icon?: React.ReactNode;
  variant?: 'outlined' | 'filled';
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'email-address' | 'numeric';
  maxLength?: number;
  editable?: boolean;
}

export const TextInput: React.FC<CustomTextInputProps> = ({
  label,
  error,
  containerStyle,
  helperText,
  required = false,
  icon,
  variant = 'outlined',
  placeholder,
  onChangeText,
  value,
  secureTextEntry = false,
  keyboardType = 'default',
  maxLength,
  editable = true,
}) => {
  const hasError = !!error;
  const borderColor = hasError ? COLORS.danger : COLORS.border;
  const backgroundColor = variant === 'filled' ? COLORS.lightGray : COLORS.white;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}

      <View style={styles.inputWrapper}>
        {icon && <View style={styles.iconLeft}>{icon}</View>}

        <RNTextInput
          style={[
            styles.input,
            {
              borderColor,
              backgroundColor,
              paddingLeft: icon ? 40 : 12,
            },
            hasError && styles.inputError,
          ]}
          placeholder={placeholder || label}
          placeholderTextColor={COLORS.gray}
          onChangeText={onChangeText}
          value={value}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          maxLength={maxLength}
          editable={editable}
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {helperText && !error && <Text style={styles.helper}>{helperText}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  required: {
    color: COLORS.danger,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.danger,
    backgroundColor: '#FFEBEE',
  },
  iconLeft: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 1,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500',
  },
  helper: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.gray,
  },
});