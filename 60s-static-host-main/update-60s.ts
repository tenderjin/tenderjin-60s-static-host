import fs from 'node:fs'
import path from 'node:path'
import { debug, fetchArticles } from './fetch-articles'
import { paseArticleUrl } from './parse-article-url'

const __dirname = new URL('.', import.meta.url).pathname

debug('process.argv', process.argv)

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
const static60sBase = path.resolve(__dirname, 'static/60s')

debug('date', date)
debug('static60sBase', static60sBase)

if (!fs.existsSync(static60sBase)) {
  fs.mkdirSync(static60sBase, { recursive: true })
}

const dateFilepath = path.resolve(static60sBase, `${date}.json`)
const hasTargetDate = fs.existsSync(dateFilepath)

if (hasTargetDate) {
  console.log(`data of [${date}] already exists, skipped`)
  process.exit(0)
}

const fakeid = process.env.WECHAT_FAKEID || 'MzU2MDU4NDE1MQ=='
const token = process.env.WECHAT_TOKEN || ''
const cookie = process.env.WECHAT_COOKIE || ''

if (!fakeid || !token || !cookie) {
  console.error('missing env: WECHAT_FAKEID, WECHAT_TOKEN, WECHAT_COOKIE')
  process.exit(1)
}

const [year, month, day] = date.split('-').map(Number)
const query = `${month}月${day}日 读懂世界`

debug('year month day', { year, month, day })
debug('query', query)

console.log(`fetching data of [${date}], query: ${query}`)

fetchArticles({
  fakeid,
  token,
  cookie,
  query,
}).then(({ isOK, list, error }) => {
  if (isOK) {
    const targetArticle = list.find(e => {
      const isTitleMatch = e.title.includes('读懂世界')
      const date = new Date(e.update_time * 1000)
      const isDateMatch = date.getFullYear() === year && date.getMonth() + 1 === month
      return isTitleMatch && isDateMatch
    })

    if (!targetArticle) {
      console.error(`expected article not update, need title: ${query}`)
      process.exit(0)
    }

    const detailLink = targetArticle.link

    paseArticleUrl(detailLink).then(item => {
      if (!item.news.length) {
        console.log('no news found, data: ', JSON.stringify(item, null, 2))
        process.exit(0)
      }

      const data = {
        date: date,
        ...item,
        cover: targetArticle.cover,
        link: detailLink.split('&chksm=')[0] || '',
        created: localeTime(targetArticle.create_time * 1000),
        created_at: targetArticle.create_time * 1000,
        updated: localeTime(targetArticle.update_time * 1000),
        updated_at: targetArticle.update_time * 1000,
      }

      debug('final data', data)

      fs.writeFileSync(dateFilepath, JSON.stringify(data, null, 2))

      console.log(`data of [${date}] saved`)
    })
  } else {
    throw new Error(error)
  }
})

function localeDate(ts: number | string | Date = Date.now()) {
  const today = ts instanceof Date ? ts : new Date(ts)

  const formatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Shanghai',
  })

  return formatter.format(today)
}

function localeTime(ts: number | string | Date = Date.now()) {
  const now = ts instanceof Date ? ts : new Date(ts)

  const formatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Shanghai',
  })

  return formatter.format(now)
}
