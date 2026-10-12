package com.bsche.banksync

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * On device boot, best-effort flush of any transactions left PENDING from a
 * previous session (the NotificationListenerService is re-bound by the system,
 * but this covers the window before it comes back up).
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != "android.intent.action.QUICKBOOT_POWERON" &&
            action != "com.htc.intent.action.QUICKBOOT_POWERON"
        ) {
            return
        }

        val appContext = context.applicationContext
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val prefs = Prefs(appContext)
                val url = prefs.webhookUrl
                val secret = prefs.webhookSecret
                if (url.isNotBlank() && secret.isNotBlank()) {
                    val db = TransactionDbHelper(appContext)
                    for (tx in db.getPendingTransactions()) {
                        val result = WebhookSender.send(
                            url = url,
                            secret = secret,
                            bank = tx.bank,
                            amount = tx.amount,
                            content = tx.content,
                            transactionId = "BS-${tx.id}-${tx.createdAt}"
                        )
                        if (result.success) db.markSynced(tx.id, result.message)
                    }
                }
            } finally {
                pendingResult.finish()
            }
        }
    }
}
