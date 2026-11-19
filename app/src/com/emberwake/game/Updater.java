package com.emberwake.game;

import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * In-app updater. Reads version.json from the game's GitHub branch, downloads the newer APK and hands it to
 * Android's PackageInstaller as an update. Because the APK is signed with the same key, Android replaces the
 * app in place and all save data is kept.
 */
class Updater {
    static final String VERSION_URL =
        "https://raw.githubusercontent.com/nooberttmc/nooberto/claude/android-game-apk-w2q4io/version.json";
    static final String ACTION_STATUS = "com.emberwake.game.INSTALL_STATUS";
    private static final int FLAG_MUTABLE = 0x02000000; // PendingIntent.FLAG_MUTABLE (API 31)

    private final MainActivity act;
    private volatile boolean busy;

    Updater(MainActivity act) { this.act = act; }

    int versionCode() {
        try {
            PackageInfo pi = act.getPackageManager().getPackageInfo(act.getPackageName(), 0);
            return pi.versionCode;
        } catch (Exception e) { return 0; }
    }

    String versionName() {
        try {
            return act.getPackageManager().getPackageInfo(act.getPackageName(), 0).versionName;
        } catch (Exception e) { return "?"; }
    }

    /** Fetches version.json in the background and passes it to window.onUpdateInfo (or onUpdateError). */
    void check() {
        new Thread(new Runnable() {
            public void run() {
                try {
                    byte[] body = get(VERSION_URL + "?t=" + System.currentTimeMillis(), null);
                    String json = new String(body, "UTF-8");
                    act.js("window.onUpdateInfo && window.onUpdateInfo(" + json + ")");
                } catch (Throwable t) {
                    act.js("window.onUpdateError && window.onUpdateError(" + quote("Couldn't reach the update server. Check your connection.") + ", true)");
                }
            }
        }).start();
    }

    /** Downloads the APK (reporting progress) and starts the install. */
    void download(final String url) {
        if (busy) return;
        if (!canInstall()) {
            act.js("window.onUpdateError && window.onUpdateError(" + quote("Allow Emberwake to install updates, then tap Update again.") + ")");
            openInstallPermissionSettings();
            return;
        }
        busy = true;
        new Thread(new Runnable() {
            public void run() {
                try {
                    File f = new File(act.getCacheDir(), "update.apk");
                    OutputStream out = new FileOutputStream(f);
                    try { get(url, out); } finally { out.close(); }
                    act.js("window.onUpdateProgress && window.onUpdateProgress(1, true)");
                    install(f);
                } catch (Throwable t) {
                    act.js("window.onUpdateError && window.onUpdateError(" + quote("Download failed: " + t.getMessage()) + ")");
                } finally {
                    busy = false;
                }
            }
        }).start();
    }

    private byte[] get(String url, OutputStream sink) throws Exception {
        for (int redirects = 0; redirects < 5; redirects++) {
            HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
            c.setConnectTimeout(15000);
            c.setReadTimeout(30000);
            c.setUseCaches(false);
            c.setInstanceFollowRedirects(true);
            int code = c.getResponseCode();
            if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
                url = c.getHeaderField("Location");
                c.disconnect();
                continue;
            }
            if (code != 200) { c.disconnect(); throw new Exception("HTTP " + code); }
            long total = c.getContentLength();
            InputStream in = c.getInputStream();
            OutputStream out = sink != null ? sink : new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            long done = 0; int n; long lastReport = 0;
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
                done += n;
                if (sink != null && total > 0 && System.currentTimeMillis() - lastReport > 120) {
                    lastReport = System.currentTimeMillis();
                    act.js("window.onUpdateProgress && window.onUpdateProgress(" + ((double) done / total) + ")");
                }
            }
            in.close();
            c.disconnect();
            return sink == null ? ((ByteArrayOutputStream) out).toByteArray() : null;
        }
        throw new Exception("Too many redirects");
    }

    private void install(File apk) throws Exception {
        PackageInstaller pi = act.getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        params.setAppPackageName(act.getPackageName());
        int id = pi.createSession(params);
        PackageInstaller.Session s = pi.openSession(id);
        try {
            OutputStream out = s.openWrite("emberwake.apk", 0, apk.length());
            InputStream in = new FileInputStream(apk);
            byte[] buf = new byte[65536]; int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            in.close();
            s.fsync(out);
            out.close();
            Intent i = new Intent(act, MainActivity.class).setAction(ACTION_STATUS);
            PendingIntent p = PendingIntent.getActivity(act, 7, i, PendingIntent.FLAG_UPDATE_CURRENT | FLAG_MUTABLE);
            s.commit(p.getIntentSender());
        } finally {
            s.close();
        }
    }

    /** Called from MainActivity.onNewIntent with the installer's status callback. */
    void onStatus(Intent intent) {
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -999);
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = (Intent) intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) {
                confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                act.startActivity(confirm);
            }
        } else if (status != PackageInstaller.STATUS_SUCCESS) {
            String msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
            act.js("window.onUpdateError && window.onUpdateError(" + quote("Update not installed" + (msg != null ? ": " + msg : ".")) + ")");
        }
    }

    boolean canInstall() {
        if (Build.VERSION.SDK_INT < 26) return true;
        try {
            Object r = act.getPackageManager().getClass().getMethod("canRequestPackageInstalls").invoke(act.getPackageManager());
            return r == null || (Boolean) r;
        } catch (Throwable t) { return true; }
    }

    private void openInstallPermissionSettings() {
        if (Build.VERSION.SDK_INT < 26) return;
        try {
            Intent i = new Intent("android.settings.MANAGE_UNKNOWN_APP_SOURCES", Uri.parse("package:" + act.getPackageName()));
            act.startActivity(i);
        } catch (Throwable t) {
            try { act.startActivity(new Intent(Settings.ACTION_SECURITY_SETTINGS)); } catch (Throwable ignored) { }
        }
    }

    static String quote(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (char ch : s.toCharArray()) {
            if (ch == '"' || ch == '\\') b.append('\\').append(ch);
            else if (ch < 32) b.append(' ');
            else b.append(ch);
        }
        return b.append('"').toString();
    }
}
