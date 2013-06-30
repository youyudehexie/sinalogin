var async = require('async');
var querystring = require('querystring');
var Request = require('request');
var assert = require('assert');
var sinassoEncoder=require('./sinaSSO').SSOEncoder;


function Sinalogin(){
	var accountInfo = {};    //账户信息
	var encryptkey = {};     //rsa加密参数
	var icode;          //验证码
	var loginInfo = {};      //登陆信息
	var callbackFn;     //登录后的回调函数
	var messagePage;        //判断cookie是否有效的页面

  var main = function(){
  	async.series([
  		getWeiboRsa,
  		parseEncryptKey,
  		login,
  		loginJump,
  		loginGetUserInfo
  	], callbackFn);
  }

	this.weibo_login = function(account, callback){
		callbackFn = callback;

		if(account.cookiefile){
			console.log('not here');
		} else {
			accountInfo = account;
			main();
		}
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
    assert(encryptkey.Content,'HTML return Fail,Because I parse it Failed!');
    callback(null);
  }

  /**
   * 前期工作准备好后，提交登录信息
   */
  var login=function(callback){

		var pass=accountInfo.passwd;
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
		if(encryptkey.Content.showpin === 1){
		    postBlock.door=icode.str;
		    postBlock.pcid=encryptkey.Content.pcid;
		}

		var postData=querystring.stringify(postBlock);

		var url = 'http://login.sina.com.cn/sso/login.php?client=ssologin.js(v1.4.5)';
		var headers={
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
		//登录
	//	Request.post(url,accountInfo.Cookie,postData,headers,loginInfo,'txt',this);
  }

  /**
   * 检测登录是否成功，成功的话继续跳转获取用户信息
   */
  var loginJump=function(callback){

    var reg=/location.replace\("(.*)"\)/;
    var res=reg.exec(loginInfo.Content);
    assert(res,'Jump Page return Fail,Because I parse it Failed!');
    var url=res[1];
    var urlJson=querystring.parse(url);
    if(urlJson.retcode == '0'){
      accountInfo.logined=true;
      Request.get(url, function(err, response, body){
      	console.log(body);
      	callback(null)
      });
    }else{
      accountInfo.logined=false;
      //登录失败，直接返回错误号
      callbackFn(urlJson.retcode,accountInfo);
    }
  }

  /**
	 * 这是个跳转页面，直接跳到下一个页面
	 */
	var loginGetUserInfo=function(callback){
		var url = 'http://www.weibo.com/youyudehexie?wvr=5&topnav=1&wvr=5&mod=logo#_rnd1372594917564'
		Request.get(url, function(err, response, body){
			console.log(body);
		})
	}



};



var sinalogin = module.exports = exports = new Sinalogin;