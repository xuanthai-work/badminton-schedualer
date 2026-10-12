package com.bsche.banksync

import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.bsche.banksync.databinding.ActivityMainBinding
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: Prefs
    private lateinit var db: TransactionDbHelper
    private val adapter = TransactionAdapter()

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

        binding.etWebhookUrl.setText(prefs.webhookUrl)
        binding.etWebhookSecret.setText(prefs.webhookSecret)

        binding.btnOpenSettings.setOnClickListener { openNotificationAccessSettings() }
        binding.btnSaveConfig.setOnClickListener { saveConfig() }
        binding.btnTestConnection.setOnClickListener { testConnection() }
        binding.btnSimulate.setOnClickListener { simulateTest() }
    }

    override fun onResume() {
        super.onResume()
        updatePermissionStatus()
        rebindNotificationService()
        refreshHistory()
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

    private fun isNotificationAccessGranted(): Boolean =
        NotificationManagerCompat.getEnabledListenerPackages(this).contains(packageName)

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
        } else {
            binding.tvPermissionStatus.text = getString(R.string.permission_denied)
            binding.tvPermissionStatus.setTextColor(
                ContextCompat.getColor(this, R.color.amber)
            )
            binding.btnOpenSettings.visibility = View.VISIBLE
        }
    }

    private fun openNotificationAccessSettings() {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { startActivity(intent) }
            .onFailure { startActivity(Intent(Settings.ACTION_SETTINGS)) }
    }

    private fun saveConfig() {
        val url = binding.etWebhookUrl.text.toString().trim()
        val secret = binding.etWebhookSecret.text.toString().trim()
        if (url.isBlank() || secret.isBlank()) {
            toast(getString(R.string.config_missing))
            return
        }
        prefs.webhookUrl = url
        prefs.webhookSecret = secret
        toast(getString(R.string.config_saved))
    }

    private fun testConnection() {
        rebindNotificationService()
        val url = binding.etWebhookUrl.text.toString().trim()
        val secret = binding.etWebhookSecret.text.toString().trim()
        if (url.isBlank() || secret.isBlank()) {
            toast(getString(R.string.config_missing))
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
