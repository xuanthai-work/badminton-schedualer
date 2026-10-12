package com.bsche.banksync

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** Sends the reconciled transaction to the BSche webhook endpoint. */
object WebhookSender {

    private val JSON = "application/json; charset=utf-8".toMediaType()

    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .writeTimeout(20, TimeUnit.SECONDS)
        .build()

    data class SendResult(
        val success: Boolean,
        val statusCode: Int,
        val message: String
    )

    suspend fun send(
        url: String,
        secret: String,
        bank: String,
        amount: Long,
        content: String,
        transactionId: String
    ): SendResult = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("bank", bank)
            put("amount", amount)
            put("content", content)
            put("transactionId", transactionId)
        }
        post(url, secret, payload)
    }

    /** Lightweight reachability/auth check used by the "Test connection" button. */
    suspend fun ping(url: String, secret: String): SendResult = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("bank", "PING")
            put("amount", 0)
            put("content", "BS PINGTEST 000000")
            put("transactionId", "PING")
        }
        post(url, secret, payload)
    }

    private fun post(url: String, secret: String, payload: JSONObject): SendResult {
        if (url.isBlank()) return SendResult(false, 0, "Empty URL")
        return try {
            val request = Request.Builder()
                .url(url)
                .header("x-webhook-secret", secret)
                .post(payload.toString().toRequestBody(JSON))
                .build()
            client.newCall(request).execute().use { response ->
                val body = response.body?.string().orEmpty()
                SendResult(
                    success = response.isSuccessful,
                    statusCode = response.code,
                    message = body.ifBlank { response.message }
                )
            }
        } catch (e: Exception) {
            SendResult(false, 0, e.message ?: "Network error")
        }
    }
}
