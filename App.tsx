import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Button,
  Switch,
  NativeModules,
  Platform,
  Alert,
  TextInput,
  I18nManager,
} from 'react-native';
import {PERMISSIONS, RESULTS, requestMultiple} from 'react-native-permissions';
import RNFS from 'react-native-fs';
import {NativeEventEmitter} from 'react-native';

const {RecordModule} = NativeModules as any;

function App(): React.JSX.Element {
  const [autoCall, setAutoCall] = useState(false);
  const [recording, setRecording] = useState(false);
  const [dirPath, setDirPath] = useState<string | null>(null);
  const [files, setFiles] = useState<
    Array<{name: string; path: string; mtime?: number}>
  >([]);
  const playerEvents = useRef(
    new NativeEventEmitter((NativeModules as any).AudioPlayerModule),
  );
  const [playingPath, setPlayingPath] = useState<string | null>(null);
  const [recordingTitle, setRecordingTitle] = useState('');

  useEffect(() => {
    I18nManager.forceRTL(true);
  }, []);

  const refreshList = useCallback(async () => {
    try {
      if (!dirPath) {
        return;
      }
      const exists = await RNFS.exists(dirPath);
      if (!exists) {
        setFiles([]);
        return;
      }
      const list = await RNFS.readDir(dirPath);
      const onlyAudio = list
        .filter(f => f.isFile() && f.name.toLowerCase().endsWith('.m4a'))
        .map(f => ({
          name: f.name,
          path: f.path,
          mtime: (f.mtime as any)?.getTime?.() ?? 0,
        }))
        .sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0));
      setFiles(onlyAudio);
    } catch (e) {
      // ignore
    }
  }, [dirPath]);

  const ensurePermissions = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return true;
    }
    const toRequest: string[] = [
      PERMISSIONS.ANDROID.RECORD_AUDIO,
      PERMISSIONS.ANDROID.READ_PHONE_STATE,
    ];
    // Android 13+
    if (Platform.Version >= 33) {
      const postNotif =
        (PERMISSIONS.ANDROID as any).POST_NOTIFICATIONS ??
        'android.permission.POST_NOTIFICATIONS';
      toRequest.push(postNotif);
    }
    const result = await requestMultiple(toRequest as any);
    const denied = Object.values(result).some(v => v !== RESULTS.GRANTED);
    if (denied) {
      Alert.alert(
        'اجازه‌ها لازم است',
        'برای ضبط صدا/تماس باید مجوزها را تأیید کنید.',
      );
      return false;
    }
    return true;
  }, []);

  const onStart = useCallback(async () => {
    if (!recordingTitle.trim()) {
      Alert.alert('عنوان لازم است', 'لطفاً عنوان ضبط را وارد کنید.');
      return;
    }
    const ok = await ensurePermissions();
    if (!ok) {
      return;
    }
    try {
      await RecordModule.setRecordingTitle(recordingTitle);
      await RecordModule.startVoiceRecording();
      setRecording(true);
      // Give it a moment then refresh list
      setTimeout(refreshList, 800);
    } catch (e: any) {
      Alert.alert('خطا در شروع ضبط', e?.message ?? String(e));
    }
  }, [ensurePermissions, refreshList, recordingTitle]);

  const onStop = useCallback(async () => {
    try {
      await RecordModule.stopVoiceRecording();
      setRecording(false);
      setTimeout(refreshList, 400);
    } catch (e: any) {
      Alert.alert('خطا در توقف ضبط', e?.message ?? String(e));
    }
  }, [refreshList]);

  const onToggleAuto = useCallback(
    async (value: boolean) => {
      const ok = await ensurePermissions();
      if (!ok) {
        return;
      }
      try {
        await RecordModule.setAutoCallRecordingEnabled(value);
        setAutoCall(value);
      } catch (e: any) {
        Alert.alert('خطا', e?.message ?? String(e));
      }
    },
    [ensurePermissions],
  );

  useEffect(() => {
    // Load recordings directory path from native
    (async () => {
      try {
        const p = await RecordModule.getRecordingDirectory();
        setDirPath(p);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    refreshList();
  }, [dirPath, refreshList]);

  const stopPlayback = useCallback(async () => {
    try {
      await (NativeModules as any).AudioPlayerModule.stop();
    } catch {}
    setPlayingPath(null);
  }, []);

  const togglePlay = useCallback(
    async (filePath: string) => {
      if (playingPath === filePath) {
        await stopPlayback();
        return;
      }
      await stopPlayback();
      try {
        await (NativeModules as any).AudioPlayerModule.play(filePath);
        setPlayingPath(filePath);
      } catch (e) {
        Alert.alert('پخش ناموفق', 'فایل قابل پخش نیست.');
      }
    },
    [playingPath, stopPlayback],
  );

  useEffect(() => {
    const sub = playerEvents.current.addListener(
      'AudioPlayerOnComplete',
      () => {
        setPlayingPath(null);
      },
    );
    return () => sub.remove();
  }, []);

  const onDelete = useCallback(
    async (filePath: string) => {
      try {
        if (playingPath === filePath) {
          stopPlayback();
        }
        await RNFS.unlink(filePath);
        refreshList();
      } catch (e) {
        Alert.alert('حذف ناموفق', 'امکان حذف فایل نبود.');
      }
    },
    [playingPath, refreshList, stopPlayback],
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>ضبط‌کننده صدا و تماس (Android)</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>ضبط صدای عادی (پس‌زمینه)</Text>
        <Text style={styles.desc}>
          تا زمانی که دکمه «پایان ضبط» را نزنید فعال می‌ماند.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="عنوان ضبط مکالمه را وارد کنید"
          value={recordingTitle}
          onChangeText={setRecordingTitle}
          textAlign="right"
        />
        <View style={styles.row}>
          <Button title="شروع ضبط" onPress={onStart} disabled={recording} />
          <View style={styles.gap12} />
          <Button title="پایان ضبط" onPress={onStop} disabled={!recording} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>ضبط خودکار تماس</Text>
        <Text style={styles.desc}>
          وقتی تماس شروع شد ضبط می‌شود و با پایان تماس متوقف می‌شود.
        </Text>
        <View style={styles.row}>
          <Text>فعال</Text>
          <Switch value={autoCall} onValueChange={onToggleAuto} />
        </View>
        <Text style={styles.note}>
          {
            'توجه: در اندرویدهای جدید ممکن است فقط صدای میکروفون ضبط شود.\nبرای ضبط دوطرفه، باید اپ به عنوان Phone/Dialer پیش‌فرض تنظیم شود.'
          }
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>فهرست ضبط‌ها</Text>
        {files.length === 0 ? (
          <Text style={styles.muted}>فعلاً فایلی وجود ندارد.</Text>
        ) : (
          files.map(f => (
            <View key={f.path} style={styles.itemRow}>
              <View style={styles.flex1}>
                <Text style={styles.itemTitle}>{f.name}</Text>
              </View>
              <View style={styles.row}>
                <Button
                  title={playingPath === f.path ? 'توقف' : 'پخش'}
                  onPress={() => togglePlay(f.path)}
                />
                <View style={styles.gap8} />
                <Button
                  title="حذف"
                  color="#b00020"
                  onPress={() => onDelete(f.path)}
                />
              </View>
            </View>
          ))
        )}
        {!!dirPath && <Text style={styles.path}>مسیر: {dirPath}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, backgroundColor: '#f7f7f7'},
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {fontSize: 16, fontWeight: '600', marginBottom: 6},
  desc: {
    color: '#444',
    marginBottom: 8,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  note: {color: '#666', fontSize: 12, marginTop: 8},
  path: {color: '#666', fontSize: 12, marginTop: 12, textAlign: 'left'},
  muted: {color: '#888', fontSize: 13},
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  itemTitle: {textAlign: 'right', writingDirection: 'rtl'},
  gap12: {width: 12},
  gap8: {width: 8},
  flex1: {flex: 1},
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default App;
