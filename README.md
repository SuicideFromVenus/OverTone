<div align="center">

# 🎧 OverTone

### Your Steam menus deserve a soundtrack.

A fork of Audio Loader built to make menu music great,<br>and the whole plugin nicer to live with.

[![Release](https://img.shields.io/badge/release-v1.5-c3006b?style=for-the-badge&labelColor=0d0221)](https://github.com/SuicideFromVenus/OverTone/releases/latest)
[![Decky Loader](https://img.shields.io/badge/Decky_Loader-plugin-ff2bd6?style=for-the-badge&labelColor=0d0221)](https://github.com/SteamDeckHomebrew/decky-loader)
[![License](https://img.shields.io/badge/license-MIT-8a2be2?style=for-the-badge&labelColor=0d0221)](LICENSE)

[**Features**](#-music-upgraded) · [**Install**](#-installation) · [**Your music**](#-bring-your-own-music) · [**Build**](#-building) · [**Config**](#-configuration) · [**Support**](#-support--credits)

</div>

---

## ✨ Why OverTone exists

OverTone is a [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) plugin that swaps Steam's UI sounds for custom packs and plays music in the menus. It's a fork of [Audio Loader](https://github.com/DeckThemes/SDH-AudioLoader) with two goals: **a better music experience**, and **a pile of quality of life improvements** that make everything feel cleaner day to day.

> [!NOTE]
> None of this exists without **EMERALD0874** and **Beebles**, who made the original plugin, the pack format and the Pack Manager. OverTone stays compatible with Audio Loader packs, and your packs and settings in `~/homebrew/sounds` are read as-is.

## 🎵 Music, upgraded

Menu music is one of the best little touches in Gaming Mode, so it should feel like a real player instead of a looping track.

| | |
|---|---|
| ⏯️ **Full controls** | Previous / play-pause / next, a now-playing line, shuffle and repeat |
| 📚 **A real queue** | Every song from every installed music pack, in order or shuffled |
| 🎚️ **Pick your song** | Multi-song packs get a **Song** dropdown, and packs with an intro play it first |
| 🎮 **Plays where it should** | Stays in Gaming Mode: pauses in the desktop UI and while a game runs |
| 🔁 **Repeat your way** | **One** (default) loops the current song, **Off** plays through the queue and wraps to the start |

## 🛠️ Quality of life

The small stuff that makes it feel polished.

| | |
|---|---|
| 🌫️ **Smooth fades** | Music fades out and in when a game launches or closes, and when Steam switches between the desktop UI and Gaming Mode. Nothing fades at plugin load or when you skip |
| 😴 **Resumes after sleep** | No reaching for play after waking the device (unless you paused it yourself) |
| 💾 **Remembers everything** | Packs, song, both volumes, shuffle, repeat and launch toggles come back on boot |
| 🎲 **Fresh each boot** | Optional **Random Sound Pack on Launch** and **Random Music on Launch** |
| 🎼 **Wide format support** | mp3, ogg, oga, opus, wav, flac, m4a, aac, webm, weba |
| 🩹 **Fails gracefully** | A missing intro or broken file is skipped instead of stopping playback |

## 🔌 Staying compatible with Audio Loader

OverTone keeps the pack format and the Pack Manager, so you can browse, install, star and uninstall packs from the Audio Loader pack store like before.

> [!IMPORTANT]
> As of Audio Loader v1.6.0, DeckThemes keeps existing music packs but no longer accepts new music submissions. For more songs, [bring your own](#-bring-your-own-music).

In [v1.6.0](https://github.com/DeckThemes/SDH-AudioLoader/releases/tag/v1.6.0), Audio Loader's maintainers made music a legacy feature and welcomed anyone who wanted to take it forward. OverTone picks up from there:

- **Desktop UI:** music keeps playing there in Audio Loader, a known issue ([#58](https://github.com/DeckThemes/SDH-AudioLoader/issues/58)). OverTone follows Steam's UI mode and fades out instead.
- **Sleep:** music stays paused after waking in Audio Loader. OverTone resumes it.
- **Player:** Audio Loader loops a single menu track. OverTone adds the queue, shuffle, repeat and per-song selection.

## 📦 Installation

OverTone will most likely never be on the Decky Plugin Store, which is a bit of a shame. The good news is it's easy to install without it. The newest built version is always on the [**Releases page**](https://github.com/SuicideFromVenus/OverTone/releases/latest), and Decky's developer menu can install it straight from there.

**Install via Decky's developer menu**

1. Open the [latest release](https://github.com/SuicideFromVenus/OverTone/releases/latest) and copy the link to the OverTone `.zip` (right-click it and copy the link address).
2. On your device, press the `...` (Quick Access) button, open the Decky tab, then the settings (gear) icon.
3. Under **General**, turn on **Developer mode**. A **Developer** tab appears.
4. Open the **Developer** tab and choose **Install Plugin from URL**.
5. Paste the zip link into the URL field and confirm. Decky downloads the plugin and reloads.

> [!TIP]
> Already downloaded the zip? The same tab also has **Install Plugin from ZIP file**. Menu names can differ a little between Decky versions.

> [!WARNING]
> **Coming from Audio Loader?** Uninstall it first (or delete its folder in `~/homebrew/plugins/`, usually `Audio Loader` or `SDH-AudioLoader`), because two plugins patching the same sounds conflict. Your packs and settings are kept.

Prefer to build it yourself? See [Building](#-building).

## 🎼 Bring your own music

A music pack is just a folder with a `pack.json` and your audio files. On a Steam Deck, use Konsole in Desktop Mode (run `passwd` first if you've never used `sudo`).

1. Make a folder: `sudo mkdir -p ~/homebrew/sounds/MyMusic`
2. Copy your songs into it (subfolders aren't scanned).
3. Add a `pack.json` (examples below).
4. Open the **Music Pack** dropdown (it rescans each time) and pick your pack. On a Deck, do this in Gaming Mode.

<details>
<summary><b>📄 pack.json examples</b></summary>

<br>

**Single song:** name the file `menu_music` plus an extension (for example `menu_music.mp3`):

```json
{ "name": "My Music", "author": "You", "version": "v1.0", "music": true }
```

**Several songs:** map them under `menu_music.mp3`. File names must match exactly, and formats can be mixed:

```json
{
  "name": "My Music",
  "author": "You",
  "version": "v1.0",
  "music": true,
  "mappings": {
    "menu_music.mp3": ["first_song.mp3", "second_song.ogg", "third_song.flac"]
  }
}
```

An optional `intro_music.<ext>` plays once before the pack's first song.

</details>

<details>
<summary><b>⚠️ Gotchas</b></summary>

<br>

- Only mapped songs are queued. `name` must be unique, and `"music": true` is required.
- File names are case-sensitive. Avoid `#`, `?` and `%` in them.
- Keep the folder under `~/homebrew/sounds`, since Steam reaches it through a symlink.
- If a pack doesn't show up, check the log: `journalctl -u plugin_loader -f`.
- To remove a pack, use the **Uninstall** tab or delete its folder.

</details>

More on creating packs: [DeckThemes docs](https://docs.deckthemes.com/#/AudioLoader/README).

## 🧱 Building

<details>
<summary><b>Build and install from source</b></summary>

<br>

You need Git, Node.js 18+, pnpm and a Decky install to test on.

```bash
git clone https://github.com/SuicideFromVenus/OverTone.git
cd OverTone
pnpm install --frozen-lockfile
pnpm run build
```

Use pnpm with the lockfile rather than `npm install`, which pulls a newer `@types/node` that breaks the type check. `pnpm run watch` rebuilds as you edit.

The plugin needs `main.py`, `plugin.json`, `package.json`, `audio_utils.py`, `audio_remoteinstall.py` and `dist/` in `~/homebrew/plugins/OverTone`:

```bash
DEST=~/homebrew/plugins/OverTone
sudo mkdir -p "$DEST"
sudo cp -r main.py plugin.json package.json audio_utils.py audio_remoteinstall.py dist "$DEST/"
sudo systemctl restart plugin_loader
```

On a Steam Deck, do this from Konsole in Desktop Mode. SteamOS's system partition is read-only, so install Node with [nvm](https://github.com/nvm-sh/nvm), or build on a PC and `scp` the files to the Deck's home folder, then `sudo cp` them into place. If the plugin looks unchanged, restart Big Picture or reboot.

**Making a release zip:** copy those files plus `README.md` and `LICENSE` into an `OverTone/` folder and zip it.

</details>

## ⚙️ Configuration

<details>
<summary><b>config.json reference</b></summary>

<br>

Settings live in `~/homebrew/sounds/config.json`. They're normally changed from the UI, and missing keys use their defaults.

| Key | Default | Description |
|---|---|---|
| `selected_pack` | `"Default"` | Active sound pack |
| `selected_music` | `"None"` | Active music pack |
| `selected_track` | `""` | Last played song file |
| `sound_volume` | `1` | UI sound volume (0 to 1) |
| `music_volume` | `0.5` | Music volume (0 to 1) |
| `music_shuffle` | `false` | Shuffle on or off |
| `music_repeat` | `"one"` | `"one"` or `"off"` (an old `"all"` reads as `"off"`) |
| `random_sound_on_launch` | `false` | Random sound pack at launch |
| `random_music_on_launch` | `false` | Random song at launch |

The fade lengths are `FADE_OUT_MS` and `FADE_IN_MS` at the top of `src/audioPlayers/musicPlayer.ts`.

</details>

## 💬 Support & credits

Found a bug, or have an idea? [Open an issue](https://github.com/SuicideFromVenus/OverTone/issues). OverTone is an unofficial fork and isn't supported by DeckThemes or the Audio Loader maintainers, so please keep the bug reports with me and spare them the pings.

<div align="center">

---

Developed by **MurderFromMars / SuicideFromVenus**, building on the work of **EMERALD0874** and **Beebles**.<br>
Licensed under MIT, with the original copyright notices kept.

</div>
