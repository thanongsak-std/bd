const express = require('express')
const app = express()

let directoryPath

process.stdin.setEncoding('utf-8')
process.stdin.on('data', (data) => {
    if (!data.startsWith('path: ')) return
    directoryPath = data.replace('path: ', '').trim()
})

app.use((req, res, next) => {
    if (!directoryPath) { return next() }
    return express.static(directoryPath)(req, res, next)
})

app.listen(0, function () {
    console.log('port: '+this.address().port)
})