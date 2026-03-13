# Run app on Android emulator (fix black screen)

If the emulator shows a **black screen** but Metro says "Android Bundled", the emulator often can't reach the dev server at your PC's IP. Use this flow:

1. **Forward port 8081** (run once per emulator session):
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```

2. **Start Metro** (in one terminal):
   ```bash
   npm start
   ```

3. **Run the app using localhost** (in another terminal):
   ```bash
   npm run android:emulator
   ```
   This sets `REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1` so the app loads the bundle from the emulator's localhost (which is forwarded to your PC).

If you see **"Something went wrong"** with a red message, that's the app's error boundary showing the real error so you can fix it.
