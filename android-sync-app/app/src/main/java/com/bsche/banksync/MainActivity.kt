package com.bsche.banksync

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.res.ColorStateList
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.View
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.bsche.banksync.databinding.ActivityMainBinding
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: Prefs
    private lateinit var db: TransactionDbHelper
    private val adapter = TransactionAdapter()

    private var onboardingShown = false

    private val txUpdateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            refreshHistory()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = Prefs(this)
        db = TransactionDbHelper(this)

        binding.rvHistory.layoutManager = LinearLayoutManager(this)
        binding.rvHistory.adapter = adapter

        binding.btnOpenSettings.setOnClickListener { openNotificationAccessSettings() }
        binding.btnTestConnection.setOnClickListener { testConnection() }
        binding.btnSimulate.setOnClickListener { simulateTest() }
        binding.btnBindManual.setOnClickListener { showManualBindDialog() }
        binding.btnUnbind.setOnClickListener { unbind() }
        binding.btnTabHistory.setOnClickListener { showTab(account = false) }
        binding.btnTabAccount.setOnClickListener { showTab(account = true) }

        updatePermissionStatus()
        updateAccountUi()
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        // Housekeeping: drop transactions older than a week.
        db.cleanOldTransactions(7)
        updatePermissionStatus()
        updateAccountUi()
        rebindNotificationService()
        refreshHistory()
        maybeShowOnboarding()
        ContextCompat.registerReceiver(
            this,
            txUpdateReceiver,
            IntentFilter(BankNotificationListenerService.ACTION_TX_UPDATE),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
    }

    override fun onPause() {
        super.onPause()
        runCatching { unregisterReceiver(txUpdateReceiver) }
    }

    // ---- Deep link / account binding ---------------------------------------

    private fun handleIntent(intent: Intent?) {
        val data = intent?.data ?: return
        if (data.scheme != "bsche" || data.host != "bind") return
        applyBind(data)
    }

    private fun applyBind(data: Uri) {
        val url = data.getQueryParameter("url").orEmpty()
        val secret = data.getQueryParameter("secret").orEmpty()
        if (url.isBlank() || secret.isBlank()) {
            toast(getString(R.string.bind_invalid))
            return
        }
        prefs.webhookUrl = url
        prefs.webhookSecret = secret
        prefs.hostName = data.getQueryParameter("hostName").orEmpty()
        prefs.hostId = data.getQueryParameter("hostId").orEmpty()
        prefs.boundAt = System.currentTimeMillis()

        updateAccountUi()
        rebindNotificationService()
        toast(getString(R.string.bind_success))
    }

    private fun showManualBindDialog() {
        val input = EditText(this).apply {
            hint = getString(R.string.bind_dialog_hint)
        }
        AlertDialog.Builder(this)
            .setTitle(R.string.bind_dialog_title)
            .setView(input)
            .setPositiveButton(android.R.string.ok) { _, _ ->
                val parsed = runCatching { Uri.parse(input.text.toString().trim()) }.getOrNull()
                if (parsed != null && parsed.scheme == "bsche") {
                    applyBind(parsed)
                } else {
                    toast(getString(R.string.bind_invalid))
                }
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun unbind() {
        prefs.clearBinding()
        updateAccountUi()
        toast(getString(R.string.unbind_success))
    }

    private fun updateAccountUi() {
        if (prefs.isBound) {
            binding.tvAccountStatus.text = getString(R.string.account_linked)
            binding.tvAccountStatus.setTextColor(
                ContextCompat.getColor(this, R.color.emerald)
            )
            val whenText = if (prefs.boundAt > 0) {
                " · " + SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
                    .format(Date(prefs.boundAt))
            } else {
                ""
            }
            binding.tvAccountHost.text =
                prefs.hostName.ifBlank { prefs.webhookUrl } + whenText
            binding.tvAccountHost.visibility = View.VISIBLE
            binding.btnBindManual.visibility = View.GONE
            binding.tvAccountHint.visibility = View.GONE
            binding.btnTestConnection.visibility = View.VISIBLE
            binding.btnUnbind.visibility = View.VISIBLE
        } else {
            binding.tvAccountStatus.text = getString(R.string.account_not_linked)
            binding.tvAccountStatus.setTextColor(
                ContextCompat.getColor(this, R.color.amber)
            )
            binding.tvAccountHost.text = ""
            binding.tvAccountHost.visibility = View.GONE
            binding.btnBindManual.visibility = View.VISIBLE
            binding.tvAccountHint.visibility = View.VISIBLE
            binding.btnTestConnection.visibility = View.GONE
            binding.btnUnbind.visibility = View.GONE
        }
    }

    // ---- Tabs --------------------------------------------------------------

    private fun showTab(account: Boolean) {
        binding.groupHistory.visibility = if (account) View.GONE else View.VISIBLE
        binding.groupAccount.visibility = if (account) View.VISIBLE else View.GONE

        val activeBg = ContextCompat.getColor(this, R.color.lime)
        val inactiveBg = ContextCompat.getColor(this, android.R.color.transparent)
        val activeText = ContextCompat.getColor(this, R.color.bg_dark)
        val inactiveText = ContextCompat.getColor(this, R.color.text_muted)

        binding.btnTabHistory.backgroundTintList =
            ColorStateList.valueOf(if (account) inactiveBg else activeBg)
        binding.btnTabHistory.setTextColor(if (account) inactiveText else activeText)

        binding.btnTabAccount.backgroundTintList =
            ColorStateList.valueOf(if (account) activeBg else inactiveBg)
        binding.btnTabAccount.setTextColor(if (account) activeText else inactiveText)
    }

    // ---- Permissions / onboarding ------------------------------------------

    private fun isNotificationAccessGranted(): Boolean =
        NotificationManagerCompat.getEnabledListenerPackages(this).contains(packageName)

    private fun isBatteryOptimizationIgnored(): Boolean {
        val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return true
        return pm.isIgnoringBatteryOptimizations(packageName)
    }

    /**
     * MIUI (and Android 12+) sometimes fails to (re)bind the listener after the
     * OS kills it. Toggling the component off/on forces system_server to bind
     * it again without killing our app process.
     */
    private fun rebindNotificationService() {
        if (!isNotificationAccessGranted()) return
        val component = ComponentName(this, BankNotificationListenerService::class.java)
        packageManager.setComponentEnabledSetting(
            component,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP
        )
        packageManager.setComponentEnabledSetting(
            component,
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP
        )
    }

    private fun updatePermissionStatus() {
        if (isNotificationAccessGranted()) {
            binding.tvPermissionStatus.text = getString(R.string.permission_granted)
            binding.tvPermissionStatus.setTextColor(
                ContextCompat.getColor(this, R.color.emerald)
            )
            binding.btnOpenSettings.visibility = View.GONE
            binding.tvServiceMini.text = getString(R.string.permission_granted)
            binding.tvServiceMini.setTextColor(
                ContextCompat.getColor(this, R.color.emerald)
            )
        } else {
            binding.tvPermissionStatus.text = getString(R.string.permission_denied)
            binding.tvPermissionStatus.setTextColor(
                ContextCompat.getColor(this, R.color.amber)
            )
            binding.btnOpenSettings.visibility = View.VISIBLE
            binding.tvServiceMini.text = getString(R.string.permission_denied)
            binding.tvServiceMini.setTextColor(
                ContextCompat.getColor(this, R.color.amber)
            )
        }
    }

    private fun openNotificationAccessSettings() {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { startActivity(intent) }
            .onFailure { startActivity(Intent(Settings.ACTION_SETTINGS)) }
    }

    @SuppressLint("BatteryLife")
    private fun requestIgnoreBatteryOptimizations() {
        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
            .setData(Uri.parse("package:$packageName"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { startActivity(intent) }
            .onFailure { openAppDetailsSettings() }
    }

    private fun openAppDetailsSettings() {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            .setData(Uri.parse("package:$packageName"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { startActivity(intent) }
    }

    private fun maybeShowOnboarding() {
        if (isNotificationAccessGranted() && isBatteryOptimizationIgnored()) return
        if (onboardingShown) return
        onboardingShown = true

        val view = layoutInflater.inflate(R.layout.dialog_onboarding, null)
        val dialog = AlertDialog.Builder(this)
            .setView(view)
            .setCancelable(true)
            .create()

        val manufacturer = Build.MANUFACTURER.lowercase(Locale.getDefault())
        val isMiui = manufacturer.contains("xiaomi") ||
            manufacturer.contains("redmi") ||
            manufacturer.contains("poco")
        view.findViewById<TextView>(R.id.tvManufacturerHint).visibility =
            if (isMiui) View.VISIBLE else View.GONE

        view.findViewById<View>(R.id.btnOnboardingNotif).setOnClickListener {
            openNotificationAccessSettings()
        }
        view.findViewById<View>(R.id.btnOnboardingBattery).setOnClickListener {
            requestIgnoreBatteryOptimizations()
        }
        view.findViewById<View>(R.id.btnOnboardingAutostart).setOnClickListener {
            openAppDetailsSettings()
        }
        view.findViewById<View>(R.id.btnOnboardingDone).setOnClickListener {
            dialog.dismiss()
        }
        dialog.show()
    }

    // ---- Webhook config ----------------------------------------------------

    private fun testConnection() {
        rebindNotificationService()
        val url = prefs.webhookUrl
        val secret = prefs.webhookSecret
        if (url.isBlank() || secret.isBlank()) {
            toast(getString(R.string.account_not_linked))
            return
        }
        lifecycleScope.launch {
            val result = WebhookSender.ping(url, secret)
            val message = when {
                result.statusCode == 401 -> "Sai secret key (401)"
                result.statusCode == 0 -> "Không kết nối được: ${result.message}"
                else -> "Server phản hồi ${result.statusCode}"
            }
            toast(message)
        }
    }

    private fun simulateTest() {
        val content = getString(R.string.simulated_content)
        val amount = 10000L
        val id = db.insertTransaction("CAKE", content, amount)
        refreshHistory()

        val url = prefs.webhookUrl
        val secret = prefs.webhookSecret
        if (url.isBlank() || secret.isBlank()) {
            toast(getString(R.string.tx_pending))
            return
        }
        lifecycleScope.launch {
            val result = WebhookSender.send(url, secret, "CAKE", amount, content, "BS-$id")
            if (result.success) {
                db.markSynced(id, result.message)
            } else {
                db.updateStatus(id, Transaction.STATUS_PENDING, result.message)
            }
            refreshHistory()
            toast(
                if (result.success) getString(R.string.tx_sent)
                else getString(R.string.tx_pending)
            )
        }
    }

    private fun refreshHistory() {
        val list = db.getAllRecent(100)
        adapter.submit(list)
        binding.tvHistoryEmpty.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
        binding.rvHistory.visibility = if (list.isEmpty()) View.GONE else View.VISIBLE
    }

    private fun toast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
}
