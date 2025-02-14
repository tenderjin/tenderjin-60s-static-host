import fs from 'node:fs';
import path from 'node:path';
import { debug, fetchArticles } from './fetch-articles';
import { paseArticleUrl } from './parse-article-url';

const __dirname = new URL('.', import.meta.url).pathname;

debug('process.argv', process.argv);

const inputDate = process.argv
  .slice(2)
  .find(e => e.includes('--date='))
  ?.replace('--date=', '');

debug('inputDate', inputDate);

if (inputDate && !/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
  console.error('invalid date format, expect: YYYY-MM-DD');
  process.exit(1);
}

const date = (inputDate || localeDate()).replace(/\//g, '-');
const static60sBase = path.resolve(__dirname, '../static/60s'); // 确保路径正确

debug('date', date);
debug('static60sBase', static60sBase);

if (!fs.existsSync(static60sBase)) {
  fs.mkdirSync(static60sBase, { recursive: true });
}

const dateFilepath = path.resolve(static60sBase, `${date}.json`);

fetchArticles({
  fakeid: process.env.WECHAT_FAKEID || 'MzU2MDU4NDE1MQ==',
  token: process.env.WECHAT_TOKEN || '',
  cookie: process.env.WECHAT_COOKIE || '',
  query: `${new Date(date).getMonth() + 1}月${new Date(date).getDate()}日 读懂世界`,
})
  .then(({ isOK, list, error }) => {
    if (!isOK) {
      throw new Error(error);
    }

    const targetArticle = list.find(e => {
      const isTitleMatch = e.title.includes('读懂世界');
      const articleDate = new Date(e.update_time * 1000);
      const isDateMatch =
        articleDate.getFullYear() === new Date(date).getFullYear() &&
        articleDate.getMonth() + 1 === new Date(date).getMonth() + 1 &&
        articleDate.getDate() === new Date(date).getDate();
      return isTitleMatch && isDateMatch;
    });

    if (!targetArticle) {
      console.error(`expected article not update, need title: ${query}`);
      process.exit(0);
    }

    return paseArticleUrl(targetArticle.link);
  })
  .then(item => {
    if (!item.news.length) {
      console.log('no news found, data: ', JSON.stringify(item, null, 2));
      process.exit(0);
    }

    const data = {
      date: date,
      ...item,
      cover: targetArticle.cover,
      link: targetArticle.link.split('&chksm=')[0] || '',
      created: localeTime(targetArticle.create_time * 1000),
      created_at: targetArticle.create_time * 1000,
      updated: localeTime(targetArticle.update_time * 1000),
      updated_at: targetArticle.update_time * 1000,
    };

    debug('final data', data);

    // 强制保存文件
    fs.writeFileSync(dateFilepath, JSON.stringify(data, null, 2));
    console.log(`Data of [${date}] saved to ${dateFilepath}`);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

function localeDate(ts: number | string | Date = Date.now()) {
  const today = ts instanceof Date ? ts : new Date(ts);
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Shanghai',
  });
  return formatter.format(today);
}

function localeTime(ts: number | string | Date = Date.now()) {
  const now = ts instanceof Date ? ts : new Date(ts);
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Shanghai',
  });
  return formatter.format(now);
}
