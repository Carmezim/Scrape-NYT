const cheerio = require('cheerio');
const request = require('request');
const _ = require('underscore');
const fs = require('fs');
//Define your target URL and HTTP method here

let articlesLinks = function(callback) {
// NYTimes latest news url
  const options = {
    withCredentials: true,
    url: 'http://www.nytimes.com/section/us#latest-panel',
    method: 'GET'
  };

  // Use request to grab the HTML defined in options returning content in "body"
  request(options, function (err, res, body) {
    console.log('getting urls');
    if (!err && res.statusCode === 200) {
      let urls = [];
      let articleContent = [];
      let articleHeadline, data;
      // Load "body"
      let $ = cheerio.load(body);
      // Select element wrapping links
      let latestNews = $('ol.story-menu');
      // Fetch links
      console.log('fetching first 6 articles links');
      latestNews.find('li > article > div > a').each(function (index, element) {
        urls.push($(element).attr('href'));
        // Number of articles that will be fetched
        return index < 6;
      });
    }
    // Iterating through articles URLs, scraping content then organizing by url, content, headline and author
    Promise.all(urls.map(function (url) {
      return new Promise(function(resolve, reject) {
        request({url: url, jar: true}, function (err, res, body) {
          if (err) { return reject(err); }
          // Fetching articles content
          let $ = cheerio.load(body);
          let title = $('h1.headline').text();
          let writer = $('span.byline').text();
          let content = $('article.story.theme-main');
          console.log('getting article content');
          content.find('div > div > p.story-body-text').each(function (index, element) {
            articleContent.push({
              url: url,
              content: ' ' + $(element).text(),
              headline: title,
              author: writer
            });
          });
          resolve({articleContent: articleContent, content: content, url: url, title: title, writer: writer});
        });
      });
    }))
    .then(function () {
    // Merge content organizing by data headline, url and content
    articleHeadline = _.groupBy(articleContent, function(item){
      return item.headline;
    });

    data = _.map(articleHeadline, function(item) {
      return {
      headline: item[0].headline,
      author: item[0].author,
      url: item[0].url,
      content: _.pluck(item, 'content')
      }
    });
    // Write content to JSON locally
    let dataJSON = JSON.stringify(data, null, 4);
    console.log("ARTICLES FETCHED: ", dataJSON);
    fs.writeFile("articles.json", dataJSON, function(err) {
      if(err){
        return console.log(err);
      }
      console.log('ARTICLES WRITTEN TO "./articles.json"');
    });
    }).catch(function (err) {
      console.log(err);
    });
  });
};
articlesLinks();


