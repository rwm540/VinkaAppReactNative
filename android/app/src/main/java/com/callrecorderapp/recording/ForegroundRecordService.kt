package com.callrecorderapp.recording

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.MediaRecorder
import android.os.Build
import android.os.Environment
import android.os.IBinder
import androidx.core.app.NotificationCompat
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ForegroundRecordService : Service() {
  private var recorder: MediaRecorder? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForeground(NOTIF_ID, buildNotification())
    val type = intent?.getStringExtra(EXTRA_TYPE) ?: TYPE_VOICE
    startRecorder(type)
    return START_STICKY
  }

  override fun onDestroy() {
    stopRecorder()
    super.onDestroy()
  }

  private fun buildNotification(): Notification {
    val channelId = ensureChannel()
    return NotificationCompat.Builder(this, channelId)
      .setContentTitle("در حال ضبط صدا")
      .setContentText("ضبط فعال است")
      .setSmallIcon(android.R.drawable.ic_btn_speak_now)
      .setOngoing(true)
      .build()
  }

  private fun ensureChannel(): String {
    val channelId = "recording_channel"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val channel = NotificationChannel(channelId, "Recording", NotificationManager.IMPORTANCE_LOW)
      nm.createNotificationChannel(channel)
    }
    return channelId
  }

  private fun startRecorder(type: String) {
    stopRecorder()
    try {
      val outFile = createOutputFile(type)
      val mr = MediaRecorder()
      mr.setAudioSource(MediaRecorder.AudioSource.MIC) // Mic fallback; VOICE_CALL is typically blocked on modern Android
      mr.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
      mr.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
      mr.setAudioEncodingBitRate(128_000)
      mr.setAudioSamplingRate(44_100)
      mr.setOutputFile(outFile.absolutePath)
      mr.prepare()
      mr.start()
      recorder = mr
    } catch (t: Throwable) {
      t.printStackTrace()
      stopSelf()
    }
  }

  private fun stopRecorder() {
    try {
      recorder?.apply {
        try { stop() } catch (_: Throwable) {}
        try { release() } catch (_: Throwable) {}
      }
    } finally {
      recorder = null
    }
  }

  private fun createOutputFile(type: String): File {
    val baseDir = getExternalFilesDir(Environment.DIRECTORY_MUSIC) ?: filesDir
    val recDir = File(baseDir, "Recordings").apply { if (!exists()) mkdirs() }
    val ts = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
    val title = if (RecordModule.recordingTitle.isNotEmpty()) "_${RecordModule.recordingTitle}" else ""
    val prefix = if (type == TYPE_CALL) "CALL" else "VOICE"
    return File(recDir, "${prefix}${title}_${ts}.m4a")
  }

  companion object {
    const val NOTIF_ID = 1001
    const val EXTRA_TYPE = "type"
    const val TYPE_VOICE = "voice"
    const val TYPE_CALL = "call"

    fun intent(context: Context, type: String): Intent = Intent(context, ForegroundRecordService::class.java).apply {
      putExtra(EXTRA_TYPE, type)
    }
  }
}
