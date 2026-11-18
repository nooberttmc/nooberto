package com.emberwake.game;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.IntentSender;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView web;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(5, 7, 15));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new Bridge(), "Android");
        web.loadUrl("file:///android_asset/index.html");
        setContentView(web);
        hideSystemUi();

        // On first launch, offer to put a shortcut on the home screen.
        SharedPreferences prefs = getSharedPreferences("emberwake", MODE_PRIVATE);
        if (!prefs.getBoolean("pinAsked", false)) {
            prefs.edit().putBoolean("pinAsked", true).apply();
            new Handler().postDelayed(new Runnable() {
                public void run() { pinShortcut(); }
            }, 1500);
        }
    }

    private void hideSystemUi() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    @Override
    protected void onPause() {
        if (web != null) {
            web.evaluateJavascript("window.onAppPause && window.onAppPause();", null);
            web.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) {
            web.onResume();
            web.evaluateJavascript("window.onAppResume && window.onAppResume();", null);
        }
        hideSystemUi();
    }

    @Override
    public void onBackPressed() {
        if (web == null) { super.onBackPressed(); return; }
        web.evaluateJavascript("(window.handleBack && window.handleBack()) ? 'y' : 'n'", new ValueCallback<String>() {
            public void onReceiveValue(String v) {
                if (v == null || v.contains("n")) moveTaskToBack(true);
            }
        });
    }

    @Override
    protected void onDestroy() {
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }

    /** Requests a pinned home-screen shortcut (Android 8+), via reflection so we can compile against API 23. */
    void pinShortcut() {
        try {
            if (Build.VERSION.SDK_INT < 26) return;
            Object sm = getSystemService("shortcut");
            Class<?> smc = Class.forName("android.content.pm.ShortcutManager");
            Boolean ok = (Boolean) smc.getMethod("isRequestPinShortcutSupported").invoke(sm);
            if (ok == null || !ok) return;
            Class<?> bc = Class.forName("android.content.pm.ShortcutInfo$Builder");
            Object b = bc.getConstructor(Context.class, String.class).newInstance(this, "emberwake_play");
            Class<?> iconC = Class.forName("android.graphics.drawable.Icon");
            Object icon = iconC.getMethod("createWithResource", Context.class, int.class).invoke(null, this, R.mipmap.ic_launcher);
            bc.getMethod("setShortLabel", CharSequence.class).invoke(b, "Emberwake");
            bc.getMethod("setIcon", iconC).invoke(b, icon);
            Intent i = new Intent(this, MainActivity.class);
            i.setAction(Intent.ACTION_MAIN);
            bc.getMethod("setIntent", Intent.class).invoke(b, i);
            Object info = bc.getMethod("build").invoke(b);
            smc.getMethod("requestPinShortcut", Class.forName("android.content.pm.ShortcutInfo"), IntentSender.class).invoke(sm, info, null);
        } catch (Throwable t) {
            // launcher doesn't support pinning; the app icon is still in the app drawer
        }
    }

    class Bridge {
        @JavascriptInterface
        public void save(String json) {
            getSharedPreferences("emberwake", MODE_PRIVATE).edit().putString("save", json).apply();
        }

        @JavascriptInterface
        public String load() {
            return getSharedPreferences("emberwake", MODE_PRIVATE).getString("save", "");
        }

        @JavascriptInterface
        public void pinShortcut() {
            runOnUiThread(new Runnable() { public void run() { MainActivity.this.pinShortcut(); } });
        }
    }
}
