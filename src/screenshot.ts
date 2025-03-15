import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
import { debug } from './fetch-articles.ts'
import { localeDate } from './utils.ts'

const __dirname = new URL('.', import.meta.url).pathname

const inputDate = process.argv
  .slice(2)
  .find(e => e.includes('--date='))
  ?.replace('--date=', '')

debug('inputDate', inputDate)

if (inputDate && !/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
  console.error('invalid date format, expect: YYYY-MM-DD')
  process.exit(1)
}

const date = (inputDate || localeDate()).replace(/\//g, '-')
const static60sBase = path.resolve(__dirname, '../static/60s')
const dateFilepath = path.resolve(static60sBase, `${date}.json`)

if (!fs.existsSync(dateFilepath)) {
  console.error(`data of [${date}] not exists`)
  process.exit(0)
}

const data = JSON.parse(fs.readFileSync(dateFilepath, 'utf-8'))
const static60sImagesBase = path.resolve(__dirname, '../static/images')

if (!fs.existsSync(static60sImagesBase)) {
  fs.mkdirSync(static60sImagesBase, { recursive: true })
}

const imageFilepath = path.resolve(static60sImagesBase, `${date}.png`)
const hasTargetDate = fs.existsSync(imageFilepath)

if (hasTargetDate) {
  console.log(`data of [${date}] already exists, skipped`)
  process.exit(0)
}

screenshotAndSave(data.link)

async function screenshotAndSave(link: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--single-process',
      '--mute-audio',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--no-zygote',
    ],
  })

  const page = await browser.newPage()
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])
  await page.setViewport({ width: 1600, height: 800, deviceScaleFactor: 2 })
  await page.goto(link, { waitUntil: 'networkidle0' })

  await new Promise(resolve => setTimeout(resolve, 30_000))

  const doms = (await page.$$('section')) || (await page.$$('body'))
  const dom = doms[3] || doms[0]

  if (!dom) {
    console.error('no dom found')
    process.exit(1)
  }

  await dom.screenshot({
    path: imageFilepath,
  })

  await browser.close()

  console.log(`screenshot saved to ${imageFilepath}`)
}
