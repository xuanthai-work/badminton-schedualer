package com.bsche.banksync

data class Transaction(
    val id: Long,
    val bank: String,
    val content: String,
    val amount: Long,
    val status: String,
    val createdAt: Long,
    val responseMessage: String?
) {
    companion object {
        const val STATUS_PENDING = "PENDING"
        const val STATUS_SYNCED = "SYNCED"
        const val STATUS_FAILED = "FAILED"
    }
}
