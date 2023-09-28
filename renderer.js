/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */
const DEBUG = true

const baseURL = () => DEBUG
  ? window['backend'].getServerUrl()
  : 'https://thanongsak-std.github.io/bd'

const app = {
  setup () {
    const onlineObj = Vue.reactive({ text: '', qrcode: '' })
    const galleryImageStore = Vue.reactive({})

    const galleryImages = Vue.computed(() => {
      return Object.values(galleryImageStore).reverse()
    })

    function selectFolder() {
      Object.keys(galleryImageStore).forEach(deleteGalleryImage)
      return window['backend'].selectFolder()
    }

    function clipOnlineObjText() {
      return navigator.clipboard.writeText(onlineObj.text)
    }

    function notImageFile(filePath) {
      return /\.(jpeg|jpg|gif|png)$/.test(filePath) == false
    }

    async function addGelleryImage(filePath) {
      if (notImageFile(filePath)) return
      const origin = await window['backend'].getOriginImage(filePath)
      const thumbnail = await window['backend'].getThumbnailImage(filePath)
      const thumbnailUrl = URL.createObjectURL(new Blob([thumbnail]))
      galleryImageStore[filePath] = { filePath, origin, thumbnail, thumbnailUrl }
    }

    async function deleteGalleryImage(filePath) {
      if (notImageFile(filePath)) return
      delete galleryImageStore[filePath]
    }

    window['backend'].watch((_, { event, filePath }) => {
      if (event === 'add') addGelleryImage(filePath)
      if (event === 'unlink') deleteGalleryImage(filePath)
    })

    const peer = new peerjs.Peer(null, { debug: DEBUG ? 3 : 2 })
    peer.on('open', async (id) => {
      onlineObj.text = `${await baseURL()}#${id}`
      const buffer = await window['backend'].getQRCodeImage(onlineObj.text)
      onlineObj.qrcode = URL.createObjectURL(new Blob([buffer]))
    })

    return {
      onlineObj,
      galleryImages,
      selectFolder,
      clipOnlineObjText,
      peer,
    }
  }
}

Vue.createApp(app).mount('#app')
