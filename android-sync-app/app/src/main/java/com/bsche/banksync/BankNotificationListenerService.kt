package com.bsche.banksync

import android.app.Notification
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Listens to system notifications, keeps only Vietcombank (com.VCB) ones that
 * carry a BSche transfer code ("BS "), queues them and syncs them to the
 * webhook — retrying automatically whenever connectivity returns.
 */
class BankNotificationListenerService : NotificationListenerService() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var db: TransactionDbHelper
    private lateinit var prefs: Prefs

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            // Network came back — flush anything still pending.
            processPending()
        }
    }

    override fun onCreate() {
        super.onCreate()
        db = TransactionDbHelper(this)
        prefs = Prefs(this)
        (getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager)
            ?.let { cm -> runCatching { cm.registerDefaultNetworkCallback(networkCallback) } }
    }

    override fun onDestroy() {
        (getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager)
            ?.let { cm -> runCatching { cm.unregisterNetworkCallback(networkCallback) } }
        scope.cancel()
        super.onDestroy()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        val notification = sbn?.notification ?: return
        val pkg = sbn.packageName ?: return
        if (pkg != VCB_PACKAGE && pkg != TEST_PACKAGE) return

        val extras = notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString().orEmpty()
        val combined = listOf(title, text, bigText)
            .filter { it.isNotBlank() }
            .joinToString(" ")

        // Only reconcile notifications that actually carry a BSche code.
        if (!combined.contains(BS_MARKER, ignoreCase = true)) return

        val amount = parseAmount(combined)
        val bank = if (pkg == VCB_PACKAGE) "VCB" else "TEST"

        db.insertTransaction(bank, combined.trim(), amount)
        notifyUi()
        processPending()
    }

    private fun processPending() {
        val url = prefs.webhookUrl
        val secret = prefs.webhookSecret
        if (url.isBlank() || secret.isBlank()) return

        scope.launch {
            for (tx in db.getPendingTransactions()) {
                val result = WebhookSender.send(
                    url = url,
                    secret = secret,
                    bank = tx.bank,
                    amount = tx.amount,
                    content = tx.content,
                    transactionId = "BS-${tx.id}-${tx.createdAt}"
                )
                when {
                    result.success -> db.markSynced(tx.id, result.message)
                    // 4xx (except transient) = permanent rejection, don't retry.
                    result.statusCode in 400..499 && result.statusCode != 408 ->
                        db.updateStatus(tx.id, Transaction.STATUS_FAILED, result.message)
                    else -> db.updateStatus(tx.id, Transaction.STATUS_PENDING, result.message)
                }
                notifyUi()
            }
        }
    }

    private fun notifyUi() {
        sendBroadcast(Intent(ACTION_TX_UPDATE).setPackage(packageName))
    }

    private fun parseAmount(text: String): Long {
        val match = AMOUNT_REGEX.find(text) ?: return 0L
        val digits = match.groupValues[1].filter { it.isDigit() }
        return digits.toLongOrNull() ?: 0L
    }

    companion object {
        const val VCB_PACKAGE = "com.VCB"
        const val TEST_PACKAGE = "com.bsche.banksync"
        const val BS_MARKER = "BS "
        const val ACTION_TX_UPDATE = "com.bsche.banksync.TX_UPDATE"

        private val AMOUNT_REGEX = Regex("""\+([0-9][0-9.,]*)\s*(?:VND|đ|₫)?""")
    }
}
