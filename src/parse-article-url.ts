import { load } from 'cheerio'
import { debug } from './fetch-articles.ts'

const TAG_NAME = 'mp-common-mpaudio'
const ATTR_NAME = 'voice_encode_fileid'

const TIP_REG = /^【微语】/
const NEWS_REG = /^\d+、/
const END_REG = /[；！～。，]\s*$/

export async function paseArticleUrl(url: string) {
  debug('url', url)

  const html = await fetch(url, {
    headers: {
      'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36`,
    },
  })
    .then(e => e.text())
    .catch(() => fetch(url).then(e => e.text()))

  const $ = load(html)
  const news: string[] = []

  let tip = ''

  const data = $('div.rich_media_content section p > span')
    // .filter((_, e) => e.children.length === 1)
    .toArray()
    .map(e => $(e).text())
    .filter(e => e.length >= 6)

  debug('data', data)

  for (const line of data) {
    if (NEWS_REG.test(line)) {
      news.push(line.replace(NEWS_REG, '').replace(END_REG, ''))
    } else if (TIP_REG.test(line)) {
      tip = line.replace(TIP_REG, '').replace(END_REG, '')
    }
  }

  const musicAudioId =
    $(TAG_NAME)
      .filter((_, e) => !$(e).attr('name')?.includes('读懂世界'))
      .first()
      .attr(ATTR_NAME) || ''

  const audioId =
    $(TAG_NAME)
      .filter((_, e) => !!$(e).attr('name')?.includes('读懂世界'))
      .first()
      .attr(ATTR_NAME) || ''

  const image =
    $('img')
      .filter((_, e) => !!$(e).attr('data-src'))
      .last()
      .attr('data-src') || ''

  // debug('html', html.slice(0, 3000))
  debug('news', news)
  debug('tip', tip)
  debug('musicAudioId', musicAudioId)
  debug('audioId', audioId)
  debug('image', image)

  return {
    news,
    audio: {
      music: musicAudioId ? `https://res.wx.qq.com/voice/getvoice?mediaid=${musicAudioId}` : '',
      news: audioId ? `https://res.wx.qq.com/voice/getvoice?mediaid=${audioId}` : '',
    },
    image,
    tip,
  }
}
