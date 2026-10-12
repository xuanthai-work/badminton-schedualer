package com.bsche.banksync

import android.annotation.SuppressLint
import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.bsche.banksync.databinding.ItemTransactionBinding
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Renders the recent transaction history with synced/pending status badges. */
class TransactionAdapter : RecyclerView.Adapter<TransactionAdapter.VH>() {

    private val items = mutableListOf<Transaction>()
    private val amountFormat = NumberFormat.getNumberInstance(Locale("vi", "VN"))
    private val timeFormat = SimpleDateFormat("dd/MM HH:mm:ss", Locale.getDefault())

    @SuppressLint("NotifyDataSetChanged")
    fun submit(list: List<Transaction>) {
        items.clear()
        items.addAll(list)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val binding = ItemTransactionBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return VH(binding)
    }

    override fun onBindViewHolder(holder: VH, position: Int) = holder.bind(items[position])

    override fun getItemCount(): Int = items.size

    inner class VH(private val binding: ItemTransactionBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(tx: Transaction) {
            val context = binding.root.context
            binding.tvContent.text = tx.content
            binding.tvTime.text = timeFormat.format(Date(tx.createdAt))
            binding.tvAmount.text =
                if (tx.amount > 0) "${amountFormat.format(tx.amount)} đ" else "—"

            val labelRes: Int
            val colorRes: Int
            when (tx.status) {
                Transaction.STATUS_SYNCED -> {
                    labelRes = R.string.status_synced
                    colorRes = R.color.emerald
                }
                Transaction.STATUS_FAILED -> {
                    labelRes = R.string.status_failed
                    colorRes = R.color.rose
                }
                else -> {
                    labelRes = R.string.status_pending
                    colorRes = R.color.amber
                }
            }
            binding.tvStatus.text = context.getString(labelRes)
            binding.tvStatus.backgroundTintList =
                ColorStateList.valueOf(ContextCompat.getColor(context, colorRes))
        }
    }
}
