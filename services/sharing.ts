import { Share } from 'react-native';

import { BRAND } from '@/constants/brand';

export async function inviteFriends() {
  await Share.share({
    message: `Join me on ${BRAND.name} — a smarter way to plan, focus and study.\n${BRAND.website}`,
    title: `Join me on ${BRAND.name}`,
  });
}
