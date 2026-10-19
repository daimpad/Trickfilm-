// Render-Vorgaben für Remotion: H.264, yuv420p, BT.709, CRF 20 (Abschnitt 10.3 der Werkstatt).
import { Config } from '@remotion/cli/config';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

Config.setEntryPoint('remotion/src/index.ts');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(20);
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setOverwriteOutput(true);

// In Cloud-Sitzungen liegt die Headless-Shell unter PLAYWRIGHT_BROWSERS_PATH, ohne Netz zum
// Nachladen; dann nimmt Remotion sie. Örtlich lädt Remotion seine eigene.
const browserPfad = process.env.PLAYWRIGHT_BROWSERS_PATH;
if (browserPfad && existsSync(browserPfad)) {
  const shell = readdirSync(browserPfad)
    .filter((d) => d.startsWith('chromium_headless_shell-'))
    .sort()
    .map((d) => join(browserPfad, d, 'chrome-linux', 'headless_shell'))
    .find((p) => existsSync(p));
  if (shell) Config.setBrowserExecutable(shell);
}
