package com.callrecorderapp.player

import android.media.MediaPlayer
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class AudioPlayerModule(private val reactCtx: ReactApplicationContext) : ReactContextBaseJavaModule(reactCtx) {
  private var player: MediaPlayer? = null

  override fun getName(): String = "AudioPlayerModule"

  @ReactMethod
  fun play(path: String, promise: Promise) {
    try {
      stopInternal()
      val mp = MediaPlayer()
      mp.setDataSource(path)
      mp.setOnCompletionListener {
        sendEvent("AudioPlayerOnComplete")
        stopInternal()
      }
      mp.prepare()
      mp.start()
      player = mp
      promise.resolve(true)
    } catch (t: Throwable) {
      promise.reject("ERR_PLAY", t)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      stopInternal()
      promise.resolve(true)
    } catch (t: Throwable) {
      promise.reject("ERR_STOP", t)
    }
  }

  @ReactMethod
  fun isPlaying(promise: Promise) {
    promise.resolve(player?.isPlaying == true)
  }

  private fun stopInternal() {
    try {
      player?.apply {
        try { stop() } catch (_: Throwable) {}
        try { release() } catch (_: Throwable) {}
      }
    } finally {
      player = null
    }
  }

  private fun sendEvent(name: String) {
    try {
      val params = Arguments.createMap()
      reactCtx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(name, params)
    } catch (_: Throwable) {}
  }
}
