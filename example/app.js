var Sinalogin = require('../lib');
var request = require('request');

var account = {
	name: '*@qq.com',
	passwd: '*',
	cookiefile: '*@qq.com.dat'
}

Sinalogin.weibo_login(account, function(err, loginInfo){
	if(loginInfo.logined){
		var j = loginInfo.j;

		request({url: 'http://weibo.com/youyudehexie?wvr=5&wvr=5&lf=reg', jar: j}, function (err, response, body) {
		  console.log(body)
		});
	}
}) 