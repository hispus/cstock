const request = require('request');
const rp = require('request-promise-native');

PRODUCT_CODES = {
  'ACT 1x6':'AA',
  'ACT 6s':'AA',
  'ACT 2x6':'AB',
  'ACT 12s':'AB',
  'ACT 3x6':'AC',
  'ACT 18s':'AC',
  'ACT 4x6':'AD',
  'ACT 24s':'AD',
  'Malaria Rapid Diagnostic Test Kit':'RD',
  'RDT':'RD',
  'RDTs':'RD',
  'Zinc 10mg':'ZN',
  'Zinc Tablets':'ZN',
  'ORS':'RS',
  'Oral Rehydration Salt':'RS',
  'Zinc/ORS Co-Pack':'ZR',
  'Zinc/ORS':'ZR',
  'Tetracycline Eye Ointment':'TE',
  'Albendazole':'AL',
  'Paracetamol':'PA',
  'Chlorine Tablets':'CH',
  'Chlorine':'CH',
  'Amoxicillin Dispersable (125mg)':'AM',
  'Amoxicillin':'AM',
  'Amoxicillin Dispersable (250mg)':'AN',
  'Male Condoms':'MC',

  'Vitamin A 50 IU':'VA',
  'Vitamin A 100 IU':'VB',
  'Vitamin A 200 IU':'VC',
  //  'COC':'CC',
  //  'Iodine':'ID',
  //  'Amoxicillin Dispensable Tablets':'AT',
}

const MONTHLY_SOH_DATASETUID = 'z2slLbjn7PM';

/**
 * getConfig
 * Set up the DHIS2 connection
 * @see https://docs.dhis2.org/2.26/en/developer/html/webapi_sms.html
 */
getConfig = (process) => {
  const dhisConfigPath = process.env.DHIS2_HOME && `${process.env.DHIS2_HOME}/config`;
  let dhisConfig;
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
 * Find the HFIC attached to this OU
 * @param UID string
 */
const getHFIC = async (UID,config) => {
  let options = {
      method: `GET`
      ,json: true
      ,uri: config.baseUrl+'/api/users.json?fields=displayName,phoneNumber&filter=userCredentials.userRoles.name:eq:HFIC&filter=organisationUnits.id:eq:'+UID
      ,headers: {'Authorization': config.authorization}
  };
  let res = await rp(options);
  return res;
};

/**
 * Find the CHEW attached to this OU
 * @param UID string
 */
const getChew = async (UID,config) => {
  let options = {
      method: `GET`
      ,json: true
      ,uri: config.baseUrl+'/api/users.json?fields=displayName,phoneNumber&filter=userCredentials.userRoles.name:eq:CHEW&filter=organisationUnits.id:eq:'+UID
      ,headers: {'Authorization': config.authorization}
  };
  let res = await rp(options);
  return res;
};

/**
 * Find the CHV for this OU (plus the parent OU info)
 * @param UID string
 */
const getCHV = async (UID,config) => {
  let options = {
      method: `GET`
      ,json: true
      ,uri: config.baseUrl+'/api/users.json?fields=displayName,phoneNumber,organisationUnits[id,name,parent[id,name]]&filter=userCredentials.userRoles.name:eq:CHV&filter=organisationUnits.id:eq:'+UID
      ,headers: {'Authorization': config.authorization}
  };
  let res = await rp(options);
  return res;
};

/**
 * check to see if a Monthly SOH report has been sent
 */
const getMonthlySOHReports = async (config,ouID,period) => {
  let options = {
      method: `GET`
      ,json: true
      ,uri: config.baseUrl+'/api/dataValueSets?dataSet='+MONTHLY_SOH_DATASETUID+'&orgUnit='+ouID+'&period='+period
      ,headers: {'Authorization': config.authorization}
  };
  let res = await rp(options);
  return res;
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
    }
    else{
      form.recipients = numbers;
    }

    request.post({
      url: config.baseUrl+'/api/sms/outbound',
      headers: {'Authorization': config.authorization},
      form: form,
      json:true
    }, (e,r,b) =>{
      if (e || r.statusCode != 200) {
        //@TODO:: notify someone of SMS gateway failure
        console.error("SMS Send Failure:",e.message);
      }
      else{
        if (b.message=="SMS sent"){
          // console.log("SMS Send Success");
        }
        else{
          //@TODO:: notify someone?
          console.error("SMS Send Exception:",b.message);
        }
      }
    });
  }
}

module.exports = {
  getConfig: getConfig,
  prevMonth: prevMonth,
  getHFIC: getHFIC,
  getChew: getChew,
  getCHV: getCHV,
  getMonthlySOHReports: getMonthlySOHReports,
  sendSMS: sendSMS
 }
