import {Alert, Platform} from 'react-native';
import {
  check,
  request,
  openSettings,
  PERMISSIONS,
  RESULTS,
  PermissionStatus,
} from 'react-native-permissions';

export async function getMicrophonePermissionStatus(): Promise<PermissionStatus> {
  const perm =
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.MICROPHONE
      : PERMISSIONS.ANDROID.RECORD_AUDIO;
  return check(perm);
}

export async function ensureMicrophonePermission(): Promise<boolean> {
  const perm =
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.MICROPHONE
      : PERMISSIONS.ANDROID.RECORD_AUDIO;
  let status = await check(perm);

  switch (status) {
    case RESULTS.GRANTED:
      return true;
    case RESULTS.DENIED: {
      const req = await request(perm);
      return req === RESULTS.GRANTED;
    }
    case RESULTS.BLOCKED: {
      Alert.alert(
        'نیاز به دسترسی میکروفون',
        'برای تماس‌های VoIP باید دسترسی میکروفون را در تنظیمات فعال کنید.',
        [
          {text: 'لغو', style: 'cancel'},
          {text: 'باز کردن تنظیمات', onPress: () => openSettings()},
        ],
      );
      return false;
    }
    case RESULTS.UNAVAILABLE: {
      Alert.alert('ناممکن', 'میکروفون روی این دستگاه/پیکربندی در دسترس نیست.');
      return false;
    }
    default:
      return false;
  }
}
