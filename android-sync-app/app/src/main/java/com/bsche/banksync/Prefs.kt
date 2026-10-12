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

    companion object {
        private const val PREFS_NAME = "bsche_bank_sync"
        private const val KEY_URL = "webhook_url"
        private const val KEY_SECRET = "webhook_secret"
    }
}
