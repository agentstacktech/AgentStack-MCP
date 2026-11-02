// Prints the one-click install links used in README.md (run after `npm run build`).
import { cursorDeeplink, cursorWebInstall, vscodeDeeplink, vscodeWebInstall } from "../dist/lib.js";

console.log(JSON.stringify({
  cursorDeeplink: cursorDeeplink(),
  cursorWebInstall: cursorWebInstall(),
  vscodeDeeplink: vscodeDeeplink(),
  vscodeInsidersDeeplink: vscodeDeeplink(undefined, undefined, "vscode-insiders"),
  vscodeWebInstall: vscodeWebInstall(),
  vscodeInsidersWebInstall: vscodeWebInstall(undefined, undefined, true),
}, null, 2));
