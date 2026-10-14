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
 * Listens to system notifications and keeps any that carry a BSche transfer
 * code ("BSCHEL" / legacy "BS "). Works across common Vietnamese banking apps
 * (and universal fallback for any app), queues matches offline and syncs them to
 * the webhook — retrying automatically whenever connectivity returns.
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

        val extras = notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString().orEmpty()
        val combined = listOf(title, text, bigText)
            .filter { it.isNotBlank() }
            .joinToString(" ")

        // Universal matcher: only reconcile notifications that actually carry a
        // BSche transfer code, no matter which app posted them.
        val hasMarker =
            combined.contains(BSCHEL_MARKER, ignoreCase = true) ||
                combined.contains(BS_MARKER, ignoreCase = true)
        if (!hasMarker) return

        val amount = parseAmount(combined)
        val bank = bankLabelFor(pkg)

        // Keep the local store tidy: drop anything older than a week.
        db.cleanOldTransactions(7)
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

    private fun bankLabelFor(pkg: String): String = when (pkg) {
        CAKE_PACKAGE, CAKE_LEGACY_PACKAGE -> "CAKE"
        "com.VCB" -> "VCB"
        "com.mbmobile" -> "MB"
        "com.techcombank.mobilebanking" -> "TCB"
        "com.tpb.mb.gprsandroid" -> "TPB"
        "com.vnpay.vpbankonline", "com.vpbank.vpbank" -> "VPB"
        "com.acb.acbpluss", "vn.acb.acbpluss" -> "ACB"
        "com.bidv" -> "BIDV"
        "com.vietinbank.ipay" -> "VTB"
        "io.lifestyle.timo" -> "TIMO"
        else -> "BANK"
    }

    /**
     * Multi-tier amount extraction. Returns 0 (and still syncs) when nothing
     * matches, so a missing amount never blocks reconciliation.
     */
    private fun parseAmount(text: String): Long {
        for (regex in AMOUNT_REGEXES) {
            val match = regex.find(text) ?: continue
            val raw = match.groupValues.getOrNull(1).orEmpty()
            val digits = raw.filter { it.isDigit() }
            val value = digits.toLongOrNull() ?: continue
            if (value > 0) return value
        }
        return 0L
    }

    companion object {
        const val CAKE_PACKAGE = "xyz.be.cake"
        const val CAKE_LEGACY_PACKAGE = "vn.cake.banking"
        const val TEST_PACKAGE = "com.bsche.banksync"
        const val BSCHEL_MARKER = "BSCHEL"
        const val BS_MARKER = "BS "
        const val ACTION_TX_UPDATE = "com.bsche.banksync.TX_UPDATE"

        // Tier 1: balance-increase wordings ("+10.000", "vừa tăng 10.000 đ",
        // "nhận được 75.000đ", "ghi có 100,000", "GD: +50.000").
        // Tier 2: any thousand-grouped amount followed by a currency word.
        // Tier 3: any 4-9 digit integer followed by a currency word.
        private val AMOUNT_REGEXES = listOf(
            Regex(
                """(?:\+|\bnhận(?:\s+được)?\b|\bvừa\s+tăng\b|\btăng\b|\bcộng\b|\bghi\s*có\b|\bGD:\s*\+)\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,10})\s*(?:VND|VNĐ|đ|₫)?""",
                RegexOption.IGNORE_CASE
            ),
            Regex(
                """([0-9]{1,3}(?:[.,][0-9]{3})+)\s*(?:VND|VNĐ|đ|₫)""",
                RegexOption.IGNORE_CASE
            ),
            Regex(
                """\b([1-9][0-9]{3,8})\s*(?:VND|VNĐ|đ|₫)\b""",
                RegexOption.IGNORE_CASE
            ),
        )
    }
}
