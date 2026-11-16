import { File } from 'expo-file-system';
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

function bytesFromBase64(base64: string) {
  const normalized = base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64;
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(normalized, 'base64'));
  }
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function uriToBytes(uri: string, base64?: string | null) {
  if (base64) return bytesFromBase64(base64);
  try {
    return bytesFromBase64(await new File(uri).base64());
  } catch {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Unable to read the selected photo.');
    return new Uint8Array(await response.arrayBuffer());
  }
}

async function ensurePhotoAccess() {
  // Android 13+ can use the system photo picker without a media permission.
  // Still request it on older Android / iOS / web, but do not block Android if denied.
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.granted) return;
  if (Platform.OS === 'android') return;
  throw new Error(
    Platform.OS === 'web'
      ? 'Allow this site to use your photos, then try again.'
      : 'Allow photo access in Settings to change your profile picture.',
  );
}

export async function pickAndUploadAvatar(userId: string) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  await ensurePhotoAccess();

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: true,
  });
  if (picked.canceled || !picked.assets[0]?.uri) return null;

  const asset = picked.assets[0];
  const bytes = await uriToBytes(asset.uri, asset.base64);
  const path = avatarObjectPath(userId);
  const { error: uploadError } = await getSupabase().storage.from(AVATAR_BUCKET).upload(path, bytes, {
    contentType: asset.mimeType || 'image/jpeg',
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
