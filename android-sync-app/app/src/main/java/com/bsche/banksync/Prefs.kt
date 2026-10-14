package com.bsche.banksync

import android.content.Context
import androidx.core.content.edit

/** Small wrapper around SharedPreferences for the webhook configuration. */
class Prefs(context: Context) {

    private val prefs =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var webhookUrl: String
        get() = prefs.getString(KEY_URL, "").orEmpty()
        set(value) = prefs.edit { putString(KEY_URL, value.trim()) }

    var webhookSecret: String
        get() = prefs.getString(KEY_SECRET, "").orEmpty()
        set(value) = prefs.edit { putString(KEY_SECRET, value.trim()) }

    /** Host account linked to this device (via deep link / QR). */
    var hostName: String
        get() = prefs.getString(KEY_HOST_NAME, "").orEmpty()
        set(value) = prefs.edit { putString(KEY_HOST_NAME, value.trim()) }

    var hostId: String
        get() = prefs.getString(KEY_HOST_ID, "").orEmpty()
        set(value) = prefs.edit { putString(KEY_HOST_ID, value.trim()) }

    var boundAt: Long
        get() = prefs.getLong(KEY_BOUND_AT, 0L)
        set(value) = prefs.edit { putLong(KEY_BOUND_AT, value) }

    val isBound: Boolean
        get() = webhookUrl.isNotBlank() && webhookSecret.isNotBlank()

    fun clearBinding() {
        prefs.edit {
            remove(KEY_URL)
            remove(KEY_SECRET)
            remove(KEY_HOST_NAME)
            remove(KEY_HOST_ID)
            remove(KEY_BOUND_AT)
        }
    }

    companion object {
        private const val PREFS_NAME = "bsche_bank_sync"
        private const val KEY_URL = "webhook_url"
        private const val KEY_SECRET = "webhook_secret"
        private const val KEY_HOST_NAME = "host_name"
        private const val KEY_HOST_ID = "host_id"
        private const val KEY_BOUND_AT = "bound_at"
    }
}
