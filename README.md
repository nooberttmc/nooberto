# Emberwake

A roguelite survival game for Android. You play a small flame drifting through a dark sea and fight off waves of shadow creatures.

**Install:** download [`Emberwake.apk`](Emberwake.apk) on your phone, open it, and allow "install unknown apps" if Android asks. The **Emberwake** icon then appears in your app drawer. On first launch the game also offers to add an icon to your home screen; you can do this again later under Settings.

## Updates
From v1.2 on, the game checks for updates when it starts, and you can also check under **Settings → Check for updates**. Tap **Update now** and Android installs the new version over the old one, so your progress is kept. The first time, Android asks you to allow Emberwake to install apps.

To publish an update: bump `versionCode`/`versionName` in `app/AndroidManifest.xml`, write the changes in `app/release-notes.txt`, run `app/build.sh`, then commit and push `Emberwake.apk` and `version.json` to this branch.

## How to play
- Drag anywhere on the screen to move. Your weapons fire on their own.
- Collect shards to level up, then pick one of 3 upgrades: new weapons, weapon levels or passive boosts.
- A **Warden** boss appears every 5 waves. Beating one lets you choose a powerful **Relic**.
- Beat the Heart of the Deep on wave 20 to clear the Depth. You can then go home or keep going in the Endless Tide.

## Progression
- **Embers** are earned on every run, win or lose. Spend them at **The Hearth** on 12 permanent upgrades.
- **6 Spirits** unlock through milestones. Each has its own starting weapon and trait.
- **10 Depths** of rising difficulty, ending with The Drowned Sun, each with its own look and soundtrack. Higher Depths pay out more Embers.
- 7 weapons, 11 passives, 12 relics and 7 enemy types, plus elites with treasure chests and 4 Warden bosses.
- The music is generated live: layers build up as the waves get harder, and bosses have their own track.

## Building
The game is HTML5 canvas and Web Audio (`app/assets`) running inside a native Android WebView. To build without Gradle:

```
sudo apt-get install aapt apksigner dalvik-exchange android-sdk-platform-23 zipalign
app/build.sh
```
`app/keystore/` holds the signing key for this hobby project. It is kept in the repo so updates install over earlier versions.
