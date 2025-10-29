package com.callrecorderapp.recording

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Environment
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class RecordModule(private val reactCtx: ReactApplicationContext) : ReactContextBaseJavaModule(reactCtx) {
  private val prefs: SharedPreferences by lazy {
    reactCtx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  }

  override fun getName(): String = "RecordModule"

  @ReactMethod
  fun startVoiceRecording(promise: Promise) {
    try {
      val intent = ForegroundRecordService.intent(reactCtx, ForegroundRecordService.TYPE_VOICE)
      if (android.os.Build.VERSION.SDK_INT >= 26) {
        reactCtx.startForegroundService(intent)
      } else {
        reactCtx.startService(intent)
      }
      promise.resolve(true)
    } catch (t: Throwable) {
      promise.reject("ERR_START", t)
    }
  }

  @ReactMethod
  fun stopVoiceRecording(promise: Promise) {
    try {
      val intent = Intent(reactCtx, ForegroundRecordService::class.java)
      reactCtx.stopService(intent)
      promise.resolve(true)
    } catch (t: Throwable) {
      promise.reject("ERR_STOP", t)
    }
  }

  @ReactMethod
  fun setAutoCallRecordingEnabled(enabled: Boolean, promise: Promise) {
    try {
      prefs.edit().putBoolean(KEY_AUTO_CALL, enabled).apply()
      promise.resolve(true)
    } catch (t: Throwable) {
      promise.reject("ERR_PREF", t)
    }
  }

  @ReactMethod
  fun getRecordingDirectory(promise: Promise) {
    try {
      val dir = getRecDir(reactCtx)
      promise.resolve(dir.absolutePath)
    } catch (t: Throwable) {
      promise.reject("ERR_DIR", t)
    }
  }

  private fun getRecDir(ctx: Context): File {
    val base = ctx.getExternalFilesDir(Environment.DIRECTORY_MUSIC) ?: ctx.filesDir
    return File(base, "Recordings").apply { if (!exists()) mkdirs() }
  }

  @ReactMethod
  fun setRecordingTitle(title: String, promise: Promise) {
    try {
      // Store title for use in service
      recordingTitle = title
      promise.resolve(true)
    } catch (t: Throwable) {
      promise.reject("ERR_TITLE", t)
    }
  }

  companion object {
    const val PREFS = "callrec_prefs"
    const val KEY_AUTO_CALL = "auto_call_recording"
    var recordingTitle: String = ""
    fun isAutoCallEnabled(ctx: Context): Boolean = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .getBoolean(KEY_AUTO_CALL, false)
  }
}
