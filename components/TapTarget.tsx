import React from 'react';
import { Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link';
};

/**
 * Web Pressable can skip DOM clicks depending on the responder path.
 * TapTarget uses a real click handler on web and leaves native alone.
 */
export function TapTarget({
  children,
  onPress,
  disabled,
  style,
  accessibilityLabel,
  accessibilityRole = 'button',
}: Props) {
  if (Platform.OS !== 'web') {
    return (
      <Pressable
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        disabled={disabled || !onPress}
        onPress={onPress}
        style={style}
      >
        {children}
      </Pressable>
    );
  }

  const inactive = Boolean(disabled || !onPress);
  const handleClick = (event?: { stopPropagation?: () => void }) => {
    event?.stopPropagation?.();
    if (inactive) return;
    onPress?.();
  };

  const webProps = {
    tabIndex: (inactive ? -1 : 0) as 0 | -1,
    onClick: handleClick,
    onKeyDown: (event: { key: string; preventDefault: () => void }) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
    },
  };

  return (
    <View
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive }}
      focusable={!inactive}
      style={[style, { cursor: inactive ? 'default' : 'pointer' } as ViewStyle]}
      {...webProps}
    >
      {children}
    </View>
  );
}
