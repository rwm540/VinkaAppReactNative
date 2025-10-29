package com.callrecorderapp.call

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import com.callrecorderapp.recording.ForegroundRecordService
import com.callrecorderapp.recording.RecordModule

class PhoneStateReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
    if (!RecordModule.isAutoCallEnabled(context)) return

    when (state) {
      TelephonyManager.EXTRA_STATE_RINGING -> {
        // Prepare to record when call is answered (OFFHOOK)
      }
      TelephonyManager.EXTRA_STATE_OFFHOOK -> {
        // Start recording as call is active
        val phoneNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER) ?: "Unknown"
        val i = ForegroundRecordService.intent(context, ForegroundRecordService.TYPE_CALL).apply {
          putExtra(ForegroundRecordService.EXTRA_PHONE_NUMBER, phoneNumber)
        }
        if (android.os.Build.VERSION.SDK_INT >= 26) context.startForegroundService(i) else context.startService(i)
      }
      TelephonyManager.EXTRA_STATE_IDLE -> {
        // Stop recording once call ended
        context.stopService(Intent(context, ForegroundRecordService::class.java))
      }
    }
  }
}
