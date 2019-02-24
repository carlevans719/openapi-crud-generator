#!/usr/bin/env node

;(async () => {
  if (process.argv.includes('--print-template')) {
    console.log(JSON.stringify(require('./lib/templ.json')))
  } else {
    const makeCrud = require('./lib/makeCrud.js')
    await makeCrud()
  }
})()
