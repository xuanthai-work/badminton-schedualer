package com.bsche.banksync

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.ConnectivityManager
import android.net.Network
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.util.Collections

/**
 * Listens to system notifications and keeps any that carry a BSche transfer
 * code ("BSCHEL" / legacy "BS "). Runs as a foreground service with a
 * persistent notification so MIUI / HyperOS / Android 8-14+ don't kill or
 * unbind it in the background. Queues matches offline and syncs them to the
 * webhook — retrying automatically whenever connectivity returns.
 */
class BankNotificationListenerService : NotificationListenerService() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var db: TransactionDbHelper
    private lateinit var prefs: Prefs

    // Session-level dedup so a group summary + its child aren't recorded twice.
    private val processedKeys = Collections.synchronizedSet(LinkedHashSet<String>())

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            processPending()
        }
    }

    override fun onCreate() {
        super.onCreate()
        db = TransactionDbHelper(this)
        prefs = Prefs(this)
        createNotificationChannel()
        startAsForeground()
        (getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager)
            ?.let { cm -> runCatching { cm.registerDefaultNetworkCallback(networkCallback) } }
    }

    override fun onDestroy() {
        (getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager)
            ?.let { cm -> runCatching { cm.unregisterNetworkCallback(networkCallback) } }
        scope.cancel()
        super.onDestroy()
    }

    // ---- Foreground service ------------------------------------------------

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "BSche Bank Sync Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Tự động bắt giao dịch và đồng bộ về BSche"
                setShowBadge(false)
            }
            (getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager)
                ?.createNotificationChannel(channel)
        }
    }

    private fun buildServiceNotification(): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("BSche Bank Sync đang chạy")
            .setContentText("Tự động bắt giao dịch và đồng bộ về BSche")
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun startAsForeground() {
        val notification = buildServiceNotification()
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ServiceCompat.startForeground(
                    this,
                    SERVICE_NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else {
                startForeground(SERVICE_NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            // startForeground can throw if the app is in an invalid state; the
            // listener still works, so never crash the service over this.
        }
    }

    // ---- Notification handling --------------------------------------------

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        val notification = sbn?.notification ?: return
        val pkg = sbn.packageName ?: return

        val combined = extractText(notification)
        processNotificationText(pkg, combined)

        // Group summary: also scan every active notification from the same app
        // so no child notification is missed (Cake/bank push several at once).
        val isGroupSummary =
            (notification.flags and Notification.FLAG_GROUP_SUMMARY) != 0 || sbn.isGroup
        if (isGroupSummary) {
            runCatching {
                getActiveNotifications()?.forEach { active ->
                    val activePkg = active.packageName ?: return@forEach
                    if (activePkg != pkg) return@forEach
                    val activeNotification = active.notification ?: return@forEach
                    processNotificationText(activePkg, extractText(activeNotification))
                }
            }
        }
    }

    /** Collects every text field a bank notification might use. */
    private fun extractText(notification: Notification): String {
        val extras = notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString().orEmpty()
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString().orEmpty()
        val summaryText =
            extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT)?.toString().orEmpty()
        val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
            ?.joinToString(" ") { it.toString() }
            .orEmpty()

        return listOf(title, text, bigText, subText, summaryText, textLines)
            .filter { it.isNotBlank() }
            .joinToString(" ")
            .trim()
    }

    private fun processNotificationText(pkg: String, text: String) {
        val combined = text.trim()
        if (combined.isEmpty()) return

        val hasMarker =
            combined.contains(BSCHEL_MARKER, ignoreCase = true) ||
                combined.contains(BS_MARKER, ignoreCase = true)
        if (!hasMarker) return

        val dedupKey = "$pkg|${combined.hashCode()}"
        synchronized(processedKeys) {
            if (processedKeys.contains(dedupKey)) return
            processedKeys.add(dedupKey)
            if (processedKeys.size > 300) {
                val oldest = processedKeys.iterator()
                if (oldest.hasNext()) {
                    oldest.next()
                    oldest.remove()
                }
            }
        }

        val amount = parseAmount(combined)
        val bank = bankLabelFor(pkg)

        db.cleanOldTransactions(7)
        db.insertTransaction(bank, combined, amount)
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
        const val CHANNEL_ID = "bsche_bank_sync_channel"
        const val SERVICE_NOTIFICATION_ID = 1001

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
