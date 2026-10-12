# Keep OkHttp + JSON defaults. Release build has minify disabled, but these
# rules make it safe to enable R8 later.
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class com.bsche.banksync.** { *; }
