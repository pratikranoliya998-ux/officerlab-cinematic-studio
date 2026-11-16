import { app, BrowserWindow, ipcMain, safeStorage, shell } from "electron";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createChatGPT, CHATGPT_USAGE_URL } from "@siwc/local";

const appId = "officerlab-chatgpt";
app.setName("OfficerLab AI Companion");
app.setPath("userData", join(app.getPath("appData"), "OfficerLab AI Companion"));
const storageDir = join(app.getPath("userData"), "chatgpt");
const credentialEncryption = {
  id: "electron-safe-storage-v1",
  isAvailable: () => app.isReady() && safeStorage.isEncryptionAvailable() &&
    (process.platform !== "linux" || ["gnome_libsecret", "kwallet", "kwallet5", "kwallet6"].includes(safeStorage.getSelectedStorageBackend())),
  encrypt: value => {
    if (!credentialEncryption.isAvailable()) throw new Error("OS credential encryption is unavailable.");
    return safeStorage.encryptString(value);
  },
  decrypt: value => {
    if (!credentialEncryption.isAvailable()) throw new Error("OS credential encryption is unavailable.");
    return safeStorage.decryptString(Buffer.from(value));
  }
};
const chatgpt = createChatGPT({
  appName: "OfficerLab AI Companion",
  appId,
  redirectPort: 0,
  sendHostId: true,
  storageDir,
  credentialEncryption,
  openBrowser: async url => {
    const target = new URL(url);
    if (target.origin !== "https://auth.openai.com") throw new Error("Unexpected sign-in destination.");
    await shell.openExternal(target.href);
  }
});
let win;
let busy = false;
const safeSession = async () => {
  const session = await chatgpt.getSession();
  return { status: session.status, sharing: session.sharing, profileLabel: session.profileLabel, identity: session.identity ? { name: session.identity.name, email: session.identity.email } : undefined };
};
function senderOnly(event) {
  if (!win || event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) throw new Error("Unauthorized desktop request.");
}
ipcMain.handle("officerlab:state", async event => { senderOnly(event); return safeSession(); });
ipcMain.handle("officerlab:signin", async event => {
  senderOnly(event); if (busy) throw new Error("Sign-in already in progress.");
  busy = true;
  try { await chatgpt.signIn(); return await safeSession(); }
  finally { busy = false; }
});
ipcMain.handle("officerlab:disconnect", async event => {
  senderOnly(event); if (busy) throw new Error("Wait for account operation to finish.");
  busy = true;
  try { await chatgpt.disconnect(); return await safeSession(); }
  finally { busy = false; }
});
ipcMain.handle("officerlab:usage", event => { senderOnly(event); return shell.openExternal(CHATGPT_USAGE_URL); });
ipcMain.handle("officerlab:models", async event => {
  senderOnly(event);
  const session = await chatgpt.getSession();
  if (!session.sharing) throw new Error("ChatGPT plan usage permission was not granted. Identity sign-in alone is insufficient.");
  return (await chatgpt.listModels()).map(model => ({ slug: model.slug, name: model.displayName || model.slug }));
});
ipcMain.handle("officerlab:ask", async (event, { prompt, model }) => {
  senderOnly(event);
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 30000) throw new Error("Enter text between 1 and 30,000 characters.");
  const session = await chatgpt.getSession();
  if (!session.sharing) throw new Error("ChatGPT plan usage is not enabled for this connection.");
  const models = await chatgpt.listModels();
  if (!models.some(item => item.slug === model)) throw new Error("Select a model available to this ChatGPT account.");
  const result = await chatgpt.streamResponse({ model, input: prompt });
  return { text: result.text };
});
async function createWindow() {
  win = new BrowserWindow({
    width: 980, height: 760, minWidth: 760, minHeight: 600,
    webPreferences: { preload: join(import.meta.dirname, "preload.cjs"), contextIsolation: true, sandbox: true, nodeIntegration: false }
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  await win.loadFile(join(import.meta.dirname, "../ui/index.html"));
}
app.whenReady().then(async () => {
  if (!credentialEncryption.isAvailable()) throw new Error("OfficerLab requires OS-backed credential encryption; no insecure fallback is allowed.");
  await chatgpt.getSession();
  await createWindow();
}).catch(error => {
  console.error("OfficerLab companion startup failed:", error.message);
  app.quit();
});
app.on("before-quit", () => chatgpt.cancelSignIn());
