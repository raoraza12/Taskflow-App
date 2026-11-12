import React from 'react';
import { StyleSheet, View, Text, TextInput, TextInputProps, TextStyle, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/colors';
import { useApp } from '../context/AppContext';
import { THEMES } from '../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  inputStyle,
  ...props
}) => {
  let activeTheme = THEMES.snow;
  try {
    const app = useApp();
    if (app?.theme && THEMES[app.theme]) {
      activeTheme = THEMES[app.theme];
    }
  } catch {}

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: activeTheme.colors.text }]}>{label}</Text>}
      <TextInput
        placeholderTextColor={activeTheme.colors.subtext}
        style={[
          styles.input,
          {
            backgroundColor: activeTheme.colors.bgElevated,
            borderColor: activeTheme.colors.border,
            color: activeTheme.colors.text,
            borderRadius: activeTheme.btnRadius,
          },
          error ? styles.inputError : null,
          props.multiline ? styles.multiline : null,
          inputStyle,
        ]}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    width: '100%',
  },
  label: {
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    color: Colors.text,
    fontSize: Typography.body,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: Colors.danger,
    fontSize: Typography.sm,
    marginTop: Spacing.xs,
  },
});

