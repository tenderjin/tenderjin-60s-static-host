paseArticleUrl(detailLink).then(item => {
  if (!item.news.length) {
    console.log('no news found, data: ', JSON.stringify(item, null, 2))
    process.exit(0)
  }

  // 将字符数组拼接为完整的新闻内容，并添加序号
  item.news = item.news.map((newsItem, index) => {
    // 将字符数组拼接为完整的字符串
    const content = Object.values(newsItem).join('');
    return {
      index: index + 1, // 添加序号
      content: content, // 完整的新闻内容
    };
  });

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
