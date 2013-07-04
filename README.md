Sinalogin
=========

Node.js微博模拟登录

#Usage

Node.js编写的模拟方式登录新浪微博

#Quick Start

	npm install sinalogin

or

	git clone https://github.com/youyudehexie/sinalogin.git
	npm install

#Example

	var Sinalogin = require('../lib'); // or var Sinalogin = require('sinalogin');
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
	});

#Public API

##p.weibo_login(account, cb)

###account

+ name: 登录名字
+ passwd: 密码
+ cookiefile: 生成的目标cookie文件，方便下次使用的时候直接调用而不用重新认证

#License
Copyright (C) 2013 by youyudehexie

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
