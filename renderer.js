/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */
const baseURL = 'https://thanongsak-std.github.io/bd/public'
// const baseURL = 'file:///D:/Student%20Project/BD%20Project/public'

const gallery = document.getElementById('gallery')
const openDirectory = document.getElementById('openDirectory')
const directoryPath = document.getElementById('directoryPath')
const previewImage = document.getElementById('previewImage')
const multipleImage = document.getElementById('multipleImage')

const peer = new Peer({ debug: 3 })
const connections = []
const filePaths = []

peer.on('open', async (id) => {
  const text = `${baseURL}/multiple.html#${id}`
  const blob = await getMultilpleQRCode(id)
  multipleImage.src = URL.createObjectURL(blob)
  multipleImage.onclick = (e) => {
    navigator.clipboard.writeText(text)
  }
})

async function makeAddPeerImage(filePath) {
  const md5 = await window['myAPI'].md5(filePath)
  const text = singleImageURL(md5)
  const file = await window['myAPI'].getThumbnail(filePath)
  const fileName = await window['myAPI'].getBasename(filePath)
  return { file, fileName, md5 }
}

async function addPeerImage(filePath) {
  const { file, fileName, md5 } = await makeAddPeerImage(filePath)
  sendPeer({ type: 'add', file, fileName, md5 })
}

function removePeerImage(md5) {
  sendPeer({ type: 'remove', md5 })
}

function removePeerImageAll() {
  sendPeer({ type: 'removeAll' })
}

function sendPeer(data) {
  connections.forEach(conn => conn.send(data))
}

peer.on('connection', (conn) => {
  conn.on('data', (data) => onConnectionData(conn, data))
})

function onConnectionData(conn, data) {
  if (data.startsWith('single: ')) downloadSingle(conn, data)
  if (data.startsWith('multiple: ')) downloadMultiple(conn)
}

async function downloadSingle(conn, data) {
  const md5 = data.replace('single: ', '').trim()
  const img = gallery.querySelector(`img[data-md5="${md5}"]`)
  if (!img) return
  const filePath = img.getAttribute('data-path')
  const file = await window['myAPI'].getImage(filePath)
  const fileName = await window['myAPI'].getBasename(filePath)
  console.log({ type: 'single', md5, file, fileName })
  conn.send({ type: 'single', md5, file, fileName })
}

async function downloadMultiple(conn) {
  connections.push(conn)

  const blob = await getMultilpleQRCode(peer.id)
  conn.send({ type: 'toMultipleQRCode', blob })

  for (let filePath of Object.keys(filePaths)) {
    const {file, fileName, md5} = await makeAddPeerImage(filePath)
    conn.send({ type: 'add', file, fileName, md5 })
  }
}

async function getMultilpleQRCode(id) {
  const text = `${baseURL}/multiple.html#${id}`
  const buffer = await window['myAPI'].getQRCode(text)
  return new Blob([buffer])
}

function singleImageURL(md5) {
  const hash = btoa(`${peer.id},${md5}`)
  return `${baseURL}/single.html#${hash}`
}

async function setDirectoryPath(path) {
  if (!path) return
  directoryPath.value = path
  await window['myAPI'].setDirectoryPath(path)

  removePeerImageAll()

  while (gallery.hasChildNodes())
    gallery.removeChild(gallery.firstChild)
}

openDirectory.addEventListener('click', async function () {
  const path = await window['myAPI'].openDirectory()
  await setDirectoryPath(path)
})

window['myAPI'].watch(async (_, { event, filePath }) => {
  if (event === 'add') await addGelleryImage(filePath)
  if (event === 'unlink') await delGalleryImage(filePath)
})

async function addGelleryImage(filePath) {
  if (!/\.(png|jpg|)$/i.test(filePath)) return
  const image = document.createElement('img')
  image.setAttribute('data-path', filePath)
  const md5 = await window['myAPI'].md5(filePath)
  image.setAttribute('data-md5', md5)
  const text = singleImageURL(md5)
  image.src = await window['myAPI'].getThumbnailURL(filePath)
  image.addEventListener('click', async () => {
    if (!image.hasAttribute('data-src')) {
      const value = await window['myAPI'].getImageURL(filePath)
      image.setAttribute('data-src', value)
    }
    const img = previewImage.querySelector('img')
    img.src = image.getAttribute('data-src')
    previewImage.classList.remove('hidden')
    navigator.clipboard.writeText(text)
  })
  gallery.insertBefore(image, gallery.firstChild)

  addPeerImage(filePath)
  filePaths[filePath] = true
}

previewImage.addEventListener('click', () => {
  previewImage.classList.add('hidden')
  previewImage.querySelector('img').src = ''
})

async function delGalleryImage(filePath) {
  if (!/\.(png|jpg)$/.test(filePath)) return
  const md5 = await window['myAPI'].md5(filePath)
  const el = gallery.querySelector(`img[data-md5="${md5}"]`)
  removePeerImage(el.getAttribute('data-md5'))
  el.parentNode.removeChild(el)
  delete filePaths[filePath]
}
