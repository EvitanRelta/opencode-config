---
name: visual-testing
description: Run GUI apps (e.g. Qt) on a hidden Xvfb display, drive them with xdotool and check screenshots, without any window appearing on the user's screen. Load this skill before any GUI or visual test.
---

# Background visual testing (Xvfb)

Nothing may appear on the user's screen. Verified on Ubuntu 20.04, 24.04 and WSL2.

## Install

    sudo apt install xvfb xdotool imagemagick    # + ffmpeg for video; xauth and fonts come along

## Run everything inside vt-run

`scripts/vt-run` (beside this file) starts a private Xvfb, runs one command on it, and tears it
down even if the command fails or is killed. It exits with the command's status.

    VT=~/.config/opencode/skills/visual-testing/scripts/vt-run
    $VT [-n DISPLAY_NUM] [-s WxH] -- bash -c '
      ./app ... > /tmp/vt/app.log 2>&1 &
      WID=$(timeout 30 xdotool search --sync --name "^<window title>$" | head -1)
      xdotool key d
      import -window "$WID" /tmp/vt/a.png'

Then view the PNGs with the read tool. Defaults: display 99, 1600x900.

- The display lives only for that one command, so put a whole test or exploration step in one
  call. Apps still running when it ends die with the display (some abort with
  "terminate called..."), so quit them first if their shutdown matters.
- Several agents at once: give each its own `-n`. vt-run refuses a display that is in use.
- An empty WID while the app runs means the window went to the real desktop: kill the app.
- On WSL the first Qt start can take several seconds; `search --sync` waits for it.

## Never set up a display by hand

vt-run already handles these WSL quirks. Without it:
- WSLg sets `QT_QPA_PLATFORM="wayland;xcb"` and a wayland-0 socket, so Qt shows the window on
  the user's desktop even with `DISPLAY=:99` or `WAYLAND_DISPLAY` unset. `xvfb-run` doesn't
  fix this. Only `QT_QPA_PLATFORM=xcb` keeps it hidden.
- With `DISPLAY=:N`, a client that can't reach the server falls back to TCP and hangs ~135 s on
  WSL. `unix:N` fails in milliseconds.
- `Xvfb -displayfd` never returns on WSL, and two `xvfb-run -a` started together both got :100.
- `pkill -f "Xvfb :99"` matches the agent's own shell and kills it.

## Input (xdotool)

- There is no window manager, so windows open at 0,0 and screen coordinates equal window
  coordinates.
- Drag: `mousemove X Y mousedown 1`, then separate `mousemove` steps, then `mouseup 1`.
  Ctrl+drag: wrap it in `keydown ctrl` ... `keyup ctrl`.
- Wheel: `click 4` (up) or `click 5` (down), one notch each. Right click: `click 3`.
  Double click: `click --repeat 2 --delay 100 1`. Qt's double-click limit is 400 ms.
- Key names include `shift+d`, `ctrl+s`, `Tab`, `Delete`, `Right` and `space`.
- To hold a key, `keydown d; sleep 2; keyup d` auto-repeats (after 660 ms, 25 per second). For
  an exact count, use `key --repeat N --delay MS d`.
- Keys go to the newest window. To target another, use `windowfocus WID` or
  `key --window WID`. `windowactivate` always fails here; `windowsize`, `windowmove` and
  `windowraise` work.
- With `QT_SCALE_FACTOR=2`, xdotool uses real pixels and the app reports half those values.

## Screenshots and video

- `import -window WID` takes 0.1-0.2 s and leaves out the cursor, so its md5 is stable.
- A covered window captures as solid black. Run `windowraise` or `windowmove` first.
- For a light app, a screenshot right after input already shows the repaint. For a busy app,
  poll until the md5 changes, or watch the app's log.
- Use video only for motion a screenshot can't show. Read the contact sheet, not the mp4:

      ffmpeg -loglevel error -f x11grab -framerate 10 -video_size 1280x720 -i "$DISPLAY" -t 3 \
          -pix_fmt yuv420p /tmp/vt/rec.mp4 </dev/null & FF=$!; ...input...; wait $FF
      ffmpeg -loglevel error -i /tmp/vt/rec.mp4 -vf "fps=2,scale=640:-1,tile=3x2" -frames:v 1 \
          /tmp/vt/sheet.png

  x11grab needs `-video_size`; without it, 20.04 grabs only 640x480. It draws the cursor unless
  you pass `-draw_mouse 0`. `-window_id` exists only on 24.04.

## Limits

- OpenGL works in software only (llvmpipe: GL 4.5 on 24.04, GL 3.1 on 20.04).
- Timings and FPS under Xvfb don't reflect real hardware.
- `QT_QPA_PLATFORM=offscreen` has no X server, so xdotool and screenshots don't work with it.
- GTK apps: vt-run sets `GDK_BACKEND=x11`, but this is untested.
