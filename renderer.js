/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */
const baseURL = async () => {
  // return 'https://thanongsak-std.github.io/bd'
  return await window['myAPI'].getServerUrl()
}

const app = {
  setup () {
    const onlineObj = Vue.reactive({ text: '', qrcode: '' })
    const images = Vue.reactive([])

    const peer = new peerjs.Peer(null, { debug: 2 })
    peer.on('open', async (id) => {
      onlineObj.text = `${await baseURL()}#${id}`
      const buffer = await window['myAPI'].getQRCode(onlineObj.text)
      onlineObj.qrcode = URL.createObjectURL(new Blob([buffer]))
    })

    function selectFolder() {
      return window['myAPI'].selectFolder()
    }

    function clipOnlineObjText() {
      return navigator.clipboard.writeText(onlineObj.text)
    }

    function notImageFile(filePath) {
      return /\.(jpeg|jpg|gif|png)$/.test(filePath) == false
    }

    async function addGelleryImage(filePath) {
      if (notImageFile(filePath)) return
      console.log('addGelleryImage', filePath)
      const origin = await window['myAPI'].getOriginImage(filePath)
      const thumbnail = await window['myAPI'].getThumbnailImage(filePath)
      const originUrl = URL.createObjectURL(new Blob([origin]))
      const thumbnailUrl = URL.createObjectURL(new Blob([thumbnail]))
      images.push({ filePath, origin, thumbnail, originUrl, thumbnailUrl })
    }

    async function deleteGalleryImage(filePath) {
      if (notImageFile(filePath)) return
      console.log('deleteGalleryImage', filePath)
      const start = images.findIndex(item => item.filePath == filePath)
      if (start != -1) images.splice(start, 1)
    }

    window['myAPI'].watch((_, { event, filePath }) => {
      if (event === 'add') addGelleryImage(filePath)
      if (event === 'unlink') deleteGalleryImage(filePath)
    })

    return {
      onlineObj,
      images,
      selectFolder,
      clipOnlineObjText,
    }
  }
}

Vue.createApp(app).mount('#app')
