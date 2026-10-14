package com.bsche.banksync

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

/**
 * Local SQLite store acting as both the capture log and the offline queue.
 * Every captured notification is written as PENDING and later flipped to
 * SYNCED (or FAILED) once the webhook call resolves.
 */
class TransactionDbHelper(context: Context) :
    SQLiteOpenHelper(context.applicationContext, DB_NAME, null, DB_VERSION) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE $TABLE (
                $COL_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                $COL_BANK TEXT NOT NULL,
                $COL_CONTENT TEXT NOT NULL,
                $COL_AMOUNT INTEGER NOT NULL DEFAULT 0,
                $COL_STATUS TEXT NOT NULL DEFAULT 'PENDING',
                $COL_CREATED_AT INTEGER NOT NULL,
                $COL_RESPONSE TEXT
            )
            """.trimIndent()
        )
        db.execSQL("CREATE INDEX idx_status ON $TABLE ($COL_STATUS)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE")
        onCreate(db)
    }

    fun insertTransaction(
        bank: String,
        content: String,
        amount: Long,
        status: String = Transaction.STATUS_PENDING,
        responseMessage: String? = null
    ): Long {
        val values = ContentValues().apply {
            put(COL_BANK, bank)
            put(COL_CONTENT, content)
            put(COL_AMOUNT, amount)
            put(COL_STATUS, status)
            put(COL_CREATED_AT, System.currentTimeMillis())
            put(COL_RESPONSE, responseMessage)
        }
        return writableDatabase.insert(TABLE, null, values)
    }

    fun getPendingTransactions(): List<Transaction> {
        val list = mutableListOf<Transaction>()
        readableDatabase.query(
            TABLE,
            null,
            "$COL_STATUS = ?",
            arrayOf(Transaction.STATUS_PENDING),
            null,
            null,
            "$COL_CREATED_AT ASC"
        ).use { cursor ->
            while (cursor.moveToNext()) list.add(cursor.toTransaction())
        }
        return list
    }

    fun getAllRecent(limit: Int = 100): List<Transaction> {
        val list = mutableListOf<Transaction>()
        readableDatabase.query(
            TABLE,
            null,
            null,
            null,
            null,
            null,
            "$COL_CREATED_AT DESC",
            limit.toString()
        ).use { cursor ->
            while (cursor.moveToNext()) list.add(cursor.toTransaction())
        }
        return list
    }

    fun markSynced(id: Long, message: String?) =
        updateStatus(id, Transaction.STATUS_SYNCED, message)

    /** Deletes transactions older than [days]. Returns the number of rows removed. */
    fun cleanOldTransactions(days: Int = 7): Int {
        val cutoff = System.currentTimeMillis() - days * 24L * 60L * 60L * 1000L
        return writableDatabase.delete(
            TABLE,
            "$COL_CREATED_AT < ?",
            arrayOf(cutoff.toString())
        )
    }

    fun updateStatus(id: Long, status: String, message: String?) {
        val values = ContentValues().apply {
            put(COL_STATUS, status)
            put(COL_RESPONSE, message)
        }
        writableDatabase.update(TABLE, values, "$COL_ID = ?", arrayOf(id.toString()))
    }

    private fun Cursor.toTransaction(): Transaction = Transaction(
        id = getLong(getColumnIndexOrThrow(COL_ID)),
        bank = getString(getColumnIndexOrThrow(COL_BANK)),
        content = getString(getColumnIndexOrThrow(COL_CONTENT)),
        amount = getLong(getColumnIndexOrThrow(COL_AMOUNT)),
        status = getString(getColumnIndexOrThrow(COL_STATUS)),
        createdAt = getLong(getColumnIndexOrThrow(COL_CREATED_AT)),
        responseMessage = getString(getColumnIndexOrThrow(COL_RESPONSE))
    )

    companion object {
        const val DB_NAME = "bsche_bank_sync.db"
        const val DB_VERSION = 1
        const val TABLE = "transactions"
        const val COL_ID = "id"
        const val COL_BANK = "bank"
        const val COL_CONTENT = "content"
        const val COL_AMOUNT = "amount"
        const val COL_STATUS = "status"
        const val COL_CREATED_AT = "created_at"
        const val COL_RESPONSE = "response_message"
    }
}
