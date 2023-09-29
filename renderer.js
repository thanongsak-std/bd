/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */
const DEBUG = false

const baseURL = () => DEBUG
  ? window['backend'].getServerUrl()
  : 'https://thanongsak-std.github.io/bd'

const app = {
  setup () {
    const peer = new peerjs.Peer(null, { debug: 2 })
    const onlineObj = Vue.reactive({ text: '', qrcode: '' })
    const galleryImageStore = Vue.reactive({})

    const previewImage = Vue.reactive({
      filePath: '',
      url: '',
      open (filePath) {
        const obj = galleryImageStore[filePath]
        if (obj.origin === null) {
          sendMessage({ event: 'origin', filePath })
          const stop = Vue.watch(() => obj.originUrl, (x) => stop(this.url = x))
        }
        this.filePath = filePath
        this.url = obj.originUrl || obj.thumbnailUrl
      },
      close () {
        this.filePath = ''
        this.url = ''
      },
      download () {
        const a = document.createElement('a')
        a.href = this.url
        a.download = `untitled.${this.filePath.split('.').reverse()?.[0]}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    })

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
      return /\.(jpeg|jpg|gif|png)$/i.test(filePath) == false
    }

    function sendMessage(message) {
      const send = (conn) => conn.forEach(x => x.send(message))
      return Object.values(peer.connections).forEach(send)
    }

    async function addGelleryImage(filePath) {
      if (notImageFile(filePath)) return
      const origin = await window['backend'].getOriginImage(filePath)
      const originUrl = URL.createObjectURL(new Blob([origin]))
      const thumbnail = await window['backend'].getThumbnailImage(filePath)
      const thumbnailUrl = URL.createObjectURL(new Blob([thumbnail]))
      galleryImageStore[filePath] = { filePath, origin, originUrl, thumbnail, thumbnailUrl }
      sendMessage({ event: 'add', filePath, thumbnail })
    }

    function deleteGalleryImage(filePath) {
      if (notImageFile(filePath)) return
      delete galleryImageStore[filePath]
      sendMessage({ event: 'unlink', filePath })
    }

    function peerConnectionSyncImage(conn) {
      Object.values(galleryImageStore).forEach(({ filePath, thumbnail }) => {
        return conn.send({ event: 'add', filePath, thumbnail })
      })
    }

    function peerGetOriginImage(conn, { filePath }) {
      const { origin } = galleryImageStore[filePath]
      conn.send({ event: 'origin', filePath, origin })
    }

    function peerConnectionAction(conn, data) {
      if (data.event === 'origin') peerGetOriginImage(conn, data)
    }

    peer.on('open', async (peerId) => {
      onlineObj.text = `${await baseURL()}#${peerId}`
      const buffer = await window['backend'].getQRCodeImage(onlineObj.text, { scale: 4 , margin: 2})
      onlineObj.qrcode = URL.createObjectURL(new Blob([buffer]))
    })

    peer.on('connection', (conn) => {
      conn.on('open', () => peerConnectionSyncImage(conn))
      conn.on('data', (data) => peerConnectionAction(conn, data))
    })

    window['backend'].watch((_, { event, filePath }) => {
      if (event === 'add') addGelleryImage(filePath)
      if (event === 'unlink') deleteGalleryImage(filePath)
    })

    return {
      onlineObj,
      galleryImages,
      previewImage,
      selectFolder,
      clipOnlineObjText,
    }
  }
}

window.myApp = Vue.createApp(app).mount('#app')
