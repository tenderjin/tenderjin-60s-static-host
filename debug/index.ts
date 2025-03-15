import { paseArticleUrl } from '../src/parse-article-url.ts'

const url =
  'http://mp.weixin.qq.com/s?__biz=MzA5MTczNDc1OQ==&mid=2247495053&idx=1&sn=51a92780d46d2b352c99e33bb2351683'

console.log(paseArticleUrl(url))
