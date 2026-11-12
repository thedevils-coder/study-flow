import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export const AVATAR_BUCKET = 'avatars';

function avatarObjectPath(userId: string) {
  return `${userId}/avatar.jpg`;
}

export async function signedAvatarUrl(path: string | null | undefined) {
  if (!path || !isSupabaseConfigured) return null;
  const { data, error } = await getSupabase().storage.from(AVATAR_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error || !data?.signedUrl) return null;
  return `${data.signedUrl}&v=${Date.now()}`;
}

async function uriToBytes(uri: string) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Unable to read the selected photo.');
  return new Uint8Array(await response.arrayBuffer());
}

export async function pickAndUploadAvatar(userId: string) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      Platform.OS === 'web'
        ? 'Allow this site to use your photos, then try again.'
        : 'Allow photo access in Settings to change your profile picture.',
    );
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (picked.canceled || !picked.assets[0]?.uri) return null;

  const bytes = await uriToBytes(picked.assets[0].uri);
  const path = avatarObjectPath(userId);
  const { error: uploadError } = await getSupabase().storage.from(AVATAR_BUCKET).upload(path, bytes, {
    contentType: picked.assets[0].mimeType || 'image/jpeg',
    upsert: true,
  });
  if (uploadError) throw new Error(uploadError.message || 'Unable to upload the profile picture.');

  const { error: profileError } = await getSupabase().from('profiles').update({ avatar_path: path }).eq('id', userId);
  if (profileError) {
    if (/avatar_path|PGRST204|42703/i.test(profileError.message)) {
      throw new Error('Profile photo storage is not applied yet. Run the latest Supabase migration, then try again.');
    }
    throw new Error(profileError.message || 'Unable to save the profile picture.');
  }

  return signedAvatarUrl(path);
}
