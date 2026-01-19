import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  style?: ViewStyle;
  loading?: boolean;
  disabled?: boolean;
}

export default function Button({ onPress, title, variant = 'primary', style, loading = false, disabled = false }: ButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return '#CBD5E0';
    switch (variant) {
      case 'primary': return '#38A169';
      case 'secondary': return '#3182CE';
      case 'danger': return '#E53E3E';
      case 'outline': return 'transparent';
      default: return '#38A169';
    }
  };

  const getTextColor = () => {
    if (variant === 'outline') return '#38A169';
    return 'white';
  };

  const getBorder = () => {
    if (variant === 'outline') return { borderWidth: 1, borderColor: '#38A169' };
    return {};
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        getBorder(),
        style,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '600',
    fontSize: 16,
  },
});
