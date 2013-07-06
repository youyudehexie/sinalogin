var async = require('async');
var querystring = require('querystring');
var Request = require('request');
var assert = require('assert');
var sinassoEncoder=require('./sinaSSO').SSOEncoder;
var fs = require('fs');
var readline = require('readline');
var Cookie = require('cookie-jar')

exports.weibo_login = function(account, input, callback){
	var accountInfo = account;    //账户信息
	var encryptkey = {};     //rsa加密参数
	var icode = {};          //验证码
	var loginInfo = {};      //登陆信息

	var messagePage;        //判断cookie是否有效的页面
  var logStatus = 0;  //登录状态

  var pincode = account.pincode || 'pincode.png'


  var _inputPinCodeFn = function(callback){
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question("输入微博登录验证码，请看当前目录下的pincode.png \n", function(code) {
      // TODO: Log the answer in a database
      console.log("你输入的验证码是: ", code);
   //   icode.str = code;
      rl.close(); 
      return callback(null, code);
    });       
  }

  if(arguments.length === 2){
    var callbackFn = input;     //登录后的回调函数
    var inputPinCodeFn = _inputPinCodeFn;
  } else {
    var inputPinCodeFn = input;
    var callbackFn = callback;     //登录后的回调函数   
  }


  var main = function(){
  	async.waterfall([
  		getWeiboRsa,
  		parseEncryptKey,
      getPinImage,
  		login,
  		loginJump,
  		test_cookie,
  	], callbackFn);
  }

  var cookie_load = function(cookie_file){ //判断是否存在cookie_file

    var data = fs.readFileSync(cookie_file, 'utf-8');
    var cookies = data.split('\n')

    var j = Request.jar()
    
    cookies.forEach(function(cookie){
      j.add(new Cookie(cookie))
    })

    return j
  }

  var test_cookie = function(j){

    var url = 'http://weibo.com/messages';
    Request({url: url, jar: j}, function (err, response, body) {
      if(err) return callbackFn(err);

      if(response.Status === 302){
        console.log('weibo Cookie Invalid!');
        return callbackFn(err);
      } else {
        console.log('weibo Cookie Healthy!')
        accountInfo.logined = true;
        accountInfo.j = j
        callbackFn(null, accountInfo);

      }
    });
  }

  /**
   * base64加密
   * @param str
   * @return {String}
   */
  var base64Encode=function(str){
    return new Buffer(str).toString('base64');
  }

  /**
   *获取RSA加密用的参数，以及检查是否需要验证码
   */
  var getWeiboRsa=function(callback){
    var user = accountInfo.name;
    var userBase64 = querystring.stringify({
        su:base64Encode(user)
    });
    var url='http://login.sina.com.cn/sso/prelogin.php?entry=weibo&callback=sinaSSOController.preloginCallBack&'+userBase64+'&rsakt=mod&checkpin=1&client=ssologin.js(v1.4.5)';
    encryptkey = {};
    encryptkey.D = (new Date).getTime();//用来计算preit，encryptkey.E
    Request(url, function(err, response, body){
    	encryptkey.Content = body;
    	callback(err);
    })
  }
  /**
	 * servertime的时间更新
	 */
  var incServertime=function(){
      encryptkey.Content.servertime++;
  }


  /**
	 * 从html中匹配出RSA加密用的参数、是否需要验证码
	 */
  var parseEncryptKey=function(callback){

    var reg=/\{.*\}/;
    try{
        var res = reg.exec(encryptkey.Content);
        var jsonEncrypt = JSON.parse(res[0]);
        encryptkey.Content = jsonEncrypt;
        encryptkey.intvalID = setInterval(incServertime,1000);
        encryptkey.E = (new Date).getTime() - encryptkey.D - (parseInt(jsonEncrypt.exectime, 10) || 0);
    }catch(e){
      encryptkey.Content = null;
      return callback(err);
    }
    assert(encryptkey.Content, 'HTML return Fail,Because I parse it Failed!');
    callback(null);
  }


  var getPinImage = function(callback){

    if(logStatus || encryptkey.Content.showpin === 1){
    	async.waterfall([
    		function(callback){
    			var url='http://login.sina.com.cn/cgi/pin.php'+"?r=" + Math.floor(Math.random() * 1e8) + "&s=" + 0 +  "&p=" + encryptkey.Content.pcid;

    			Request(url).pipe(fs.createWriteStream(pincode));
    			callback(null);

    		},
        inputPinCodeFn
    	], callback);

    }else{
    	console.log('不需要验证码');
    	callback(null, null);
    }
  }

  /**
   * 前期工作准备好后，提交登录信息
   */
  var login = function(code, callback){
    console.log('code: ' + code);
		var pass = accountInfo.passwd;
		//加密用到的参数集合到一起
		// 相同参数每次加密产生的结果都是不同的，这是正常现象，
		// 是rsa2的内部机制导致的，不影响解密
		var encParam={
		    e:'10001',  //固定的
		    n:encryptkey.Content.pubkey,    //公钥
		    servertime:encryptkey.Content.servertime,   //加密用到的
		    nonce:encryptkey.Content.nonce      //加密用到的随机数
		};


		//停止增加,释放资源
		clearInterval(encryptkey.intvalID);

		//rsa2加密sinassoEncoder来自新浪自己的加密文件经过修改而来
		var rsaKey=new sinassoEncoder.RSAKey();
		rsaKey.setPublic(encParam.n, encParam.e);
		pass = rsaKey.encrypt([encParam.servertime, encParam.nonce].join("\t") + "\n" + pass);


		//组装提交的参数
		var postBlock={
		    'encoding':'UTF-8',
		    'entry':'weibo',
		    'from':'',
		    'gateway':'1',
		    'nonce':encParam.nonce,
		    'pagerefer':'http://weibo.com/a/download',
		    'prelt':encryptkey.E,
		    'pwencode':'rsa2',
		    'returntype':'META',
		    'rsakv':encryptkey.Content.rsakv,
		    'savestate':'7',
		    'servertime':encParam.servertime,
		    'service':'miniblog',
		    'sp':pass,
		    'su':base64Encode(accountInfo.name),
		    'url':'http://weibo.com/ajaxlogin.php?framelogin=1&callback=parent.sinaSSOController.feedBackUrlCallBack',
		    'useticket':'1',
		    'vsnf':'1'
		};

		//和验证码相关的键值
		if(logStatus ||　encryptkey.Content.showpin === 1){
	    postBlock.door = code;
	    postBlock.pcid = encryptkey.Content.pcid;
		}

		var postData = querystring.stringify(postBlock);

		var url = 'http://login.sina.com.cn/sso/login.php?client=ssologin.js(v1.4.5)';
		var headers = {
		    'Referer':'http://weibo.com/?from=bp'
		    ,'Accept-Language': 'zh-cn'
		    ,'Content-Type':'application/x-www-form-urlencoded'
		    ,'Connection': 'Keep-Alive'
		};

		var option = {
			method: 'POST',
			url: url,
			headers: headers,
			body: postData
		}

		Request(option, function(err, response, body){
			loginInfo.Content = body;
			callback(err);
		})

  }

  /**
   * 检测登录是否成功，成功的话继续跳转获取用户信息
   */
  var loginJump=function(callback){

    var reg = /location.replace\("(.*)"\)/;
    var res = reg.exec(loginInfo.Content);
    assert(res,'Jump Page return Fail,Because I parse it Failed!');
    var url = res[1];
    var urlJson = querystring.parse(url);

    if(urlJson.retcode == '0'){
      var j = Request.jar();
      accountInfo.logined = true;
      Request.get({url: url, jar: j}, function(err, response, body){
        cookie_save(j, accountInfo.cookiefile);
      	callback(null, j);
      });

    }else{
      if(urlJson.retcode == 4049){
        logStatus = 1;
        return main();
      }

      accountInfo.logined = false;
      //登录失败，直接返回错误号
      callbackFn(urlJson.retcode, accountInfo);
    }
  }

  var cookie_save = function(j, cookie_file){
    var cookies = j.cookies;
    var result = []
    cookies.forEach(function(cookie){
      result.push(cookie.str);
    });

    var data = result.join('\n');

    fs.writeFileSync(cookie_file, data);
  }

  if(account.cookiefile && fs.existsSync(account.cookiefile)){
    var j = cookie_load(account.cookiefile)
    return test_cookie(j)
  } else {
    main();
  }


};

