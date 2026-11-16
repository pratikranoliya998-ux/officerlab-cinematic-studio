const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("officerlabAI", {
  state: () => ipcRenderer.invoke("officerlab:state"),
  signIn: () => ipcRenderer.invoke("officerlab:signin"),
  disconnect: () => ipcRenderer.invoke("officerlab:disconnect"),
  usage: () => ipcRenderer.invoke("officerlab:usage"),
  models: () => ipcRenderer.invoke("officerlab:models"),
  ask: (prompt, model) => ipcRenderer.invoke("officerlab:ask", { prompt, model })
});