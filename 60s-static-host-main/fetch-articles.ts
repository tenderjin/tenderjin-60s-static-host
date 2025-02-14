interface FetchOptions {
  fakeid: string
  token: string
  cookie: string
  begin?: number
  count?: number
  query?: string
}

interface FetchResponse {
  isOK: boolean
  list: ArticleItem[]
  count: number
  error: any
}

export async function fetchArticles(options: FetchOptions): Promise<FetchResponse> {
  const { fakeid, token, cookie, query = '' } = options

  debug('options', options)

  const url = new URL('https://mp.weixin.qq.com/cgi-bin/appmsg')

  Object.entries({
    action: 'list_ex',
    fakeid,
    query,
    begin: options?.begin ?? 0,
    count: options?.count ?? 4,
    type: 9,
    need_author_name: 1,
    token,
    lang: 'zh_CN',
    f: 'json',
    ajax: 1,
  }).forEach(([key, value]) => {
    url.searchParams.append(key, value.toString())
  })

  debug('url', url.toString())

  return fetch(url, {
    headers: {
      Cookie: cookie,
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media%2Fappmsg_edit_v2&action=edit&isNew=1&type=10&token=${token}&lang=zh_CN&timestamp=${Date.now()}`,
      'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36`,
    },
  })
    .then(e => {
      if (e.status !== 200) {
        e.text().then(text => {
          throw new Error(`fetch failed, status: ${e.status}, result: ${text}`)
        })
      } else {
        return e.json()
      }
    })
    .then(e => {
      debug('app_msg_cnt', e?.app_msg_cnt)
      debug('app_msg_list', e?.app_msg_list)
      debug('title', e?.app_msg_list?.map((e: any) => e.title)?.join(', '))

      return {
        isOK: e?.base_resp?.ret === 0,
        list: (e?.app_msg_list || []) as ArticleItem[],
        count: e?.app_msg_cnt || 0,
        error: e?.base_resp?.ret === 0 ? null : e?.base_resp?.err_msg,
      }
    })
    .catch(err => {
      console.error(err)

      return {
        isOK: false,
        list: [] as ArticleItem[],
        count: 0,
        error: err,
      }
    })
}

export interface ArticleItem {
  aid: string
  album_id: string
  appmsg_album_infos: any[]
  appmsgid: number
  audio_info?: {
    audio_infos: {
      audio_id: string
      masssend_audio_id: string
      play_length: number
      title: string
      trans_state: number
      voice_verify_state: number
    }[]
  }
  author_name: string
  checking: number
  copyright_type: number
  cover: string
  create_time: number
  digest: string
  has_red_packet_cover: number
  is_pay_subscribe: number
  item_show_type: number
  itemidx: number
  link: string
  media_duration: string
  mediaapi_publish_status: number
  pay_album_info: {
    appmsg_album_infos: any[]
  }
  tagid: any[]
  title: string
  update_time: number
}

export function debug(name: any, value: any) {
  console.log(`[${name}] => `, value, `\n`)
}
