var request = require('request')
var j = request.jar()


//var cookie = request.cookie('PREF=ID=8ea5c8d33a9bf6ab:U=fe8bcbc4a350bfc7:FF=2:LD=zh-CN:NW=1:TM=1372597935:LM=1372597935:S=W8IVoUUM7Jpk84lT; expires=Tue, 30-Jun-2015 13:12:15 GMT; path=/; domain=.google.com.hk')

//console.log(cookie)

request({url: 'http://www.google.com', jar: j}, function (err, response, body) {
	console.log(j.cookies[0].str)
	//console.log(j.cookieString(response.request.headers))
  request('http://images.google.com')

})