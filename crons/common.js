const request = require('request');
const rp = require('request-promise-native');
const fs = require('fs');

/**
 * getConfig
 * Set up the DHIS2 connection
 * @see https://docs.dhis2.org/2.26/en/developer/html/webapi_sms.html
 */
getConfig = (process) => {
  let dhisConfigPath, dhisConfig;
  //prioritize a local config file
  if (fs.existsSync('./config.json')){
    dhisConfigPath = './config';
  }
  else{
    dhisConfigPath = process.env.DHIS2_HOME && `${process.env.DHIS2_HOME}/config`;
  }
  try {
      dhisConfig = require(dhisConfigPath);
      // console.log('\nLoaded DHIS config');
  } catch (e) {
      // Failed to load config file - use default config
      console.warn(`\nWARNING! Failed to load DHIS config:`, e.message);
      // console.info('Using default config');
      dhisConfig = {
          baseUrl: 'http://localhost:8080/dhis',
          authorization: 'Basic YWRtaW46ZGlzdHJpY3Q=', // admin:district
      };
  }
  return dhisConfig;
}

/**
 * Given the current date, return the last month
 */
prevMonth = (dateObj) => {
	var tempDateObj = new Date(dateObj);
	if(tempDateObj.getMonth) {
		tempDateObj.setMonth(tempDateObj.getMonth() - 1);
	} else {
		tempDateObj.setYear(tempDateObj.getYear() - 1);
		tempDateObj.setMonth(12);
	}
	return tempDateObj
};


/**
 * Find all users with given USERROLE
 * @param UID string
 */
const getAllWithRole = async (role, config) => {
  let options = {
      method: `GET`
      ,json: true
      ,uri: config.baseUrl+'/api/users.json?paging=false&fields=displayName,phoneNumber,organisationUnits[id,name,level,parent[id,name]]&filter=userCredentials.disabled:eq:false&filter=userCredentials.userRoles.name:eq:'+role
      ,headers: {'Authorization': config.authorization}
  };
  let res = await rp(options);
  return res;
};


/**
 * Find the users with USERROLE for this OU (plus the parent OU info in case we need to notify upstream as well)
 * @param UID string
 */
const getRoleAtOU = async (UID, role, config) => {
  let options = {
      method: `GET`
      ,json: true
      ,uri: config.baseUrl+'/api/users.json?paging=false&fields=displayName,phoneNumber,organisationUnits[id,name,level,parent[id,name]]&filter=userCredentials.disabled:eq:false&filter=userCredentials.userRoles.name:eq:'+role+'&filter=organisationUnits.id:eq:'+UID
      ,headers: {'Authorization': config.authorization}
  };
  let res = await rp(options);
  return res;
};


/**
 * check a datavalueset for existing report
 */
const getDataValueSet = async (dsID, ouID, period, config) => {
  let options = {
      method: `GET`
      ,json: true
      ,uri: config.baseUrl+'/api/dataValueSets?dataSet='+dsID+'&orgUnit='+ouID+'&period='+period
      ,headers: {'Authorization': config.authorization}
  };
  let res = await rp(options);
  return res;
};

/**
 * make sure the phoneNumber is somewhat valid
 */
const validatePhone = (phone,prefix) => {
  if (phone.substr(0,4)!=prefix){
    return false;
  }
  if (phone.indexOf(' ')!=-1){
    return false;
  }
  return true;
};

/**
 * sendSMS
 * Send a bulk SMS message out via the DHIS2 server
 * @see https://docs.dhis2.org/2.26/en/developer/html/webapi_sms.html
 */
sendSMS = (config,numbers,message) => {
  if (numbers.length>0 && message!='') {
    let form = {"message":message};

    if (numbers.length==1){
      form.recipient = numbers[0];
      privateSendSMS(config,form);
    }
    else if (numbers.length<=600){
      form.recipients = numbers;
      privateSendSMS(config,form);
    }
    else{
      //break up the numbers into 600 message blocks
      var i,j,temparray,chunk = 600;
      for (i=0,j=numbers.length; i<j; i+=chunk) {
          form.recipients = numbers.slice(i,i+chunk);
          privateSendSMS(config,form);
      }
    }
  }
}

privateSendSMS = (config, form) => {
  // gertrude, eric
  // form.recipients=['+254713142873','+254721926252'];

  request.post({
    url: config.baseUrl+'/api/sms/outbound',
    headers: {'Authorization': config.authorization},
    body: form,
    json:true
  }, (e,r,b) =>{
    if (e || r.statusCode != 200) {
      //@TODO:: notify someone of SMS gateway failure
      console.error("SMS Send Failure:",e,b.body);
    }
    else{
      if (b.message=="SMS sent" || b.message=="Message sent"){
        // console.log("SMS Send Success");
      }
      else{
        //@TODO:: notify someone?
        console.error("SMS Send Exception:",b.message);
      }
    }
  });
};

module.exports = {
  getConfig: getConfig,
  prevMonth: prevMonth,
  getRoleAtOU: getRoleAtOU,
  getAllWithRole: getAllWithRole,
  validatePhone: validatePhone,
  getDataValueSet: getDataValueSet,
  sendSMS: sendSMS
 }
