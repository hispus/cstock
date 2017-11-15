/**
 *  sms_chv_monthly_late.js
 *  Remind all CHVs who have not submitted their Monthly CHV Stock on Hand Report
 */

const request = require('request');
const rp = require('request-promise-native');

require('./utils');


const SMS_MESSAGE = 'SMS Late SOH Report (from Greg)';
const DATASETUID = 'z2slLbjn7PM';

let config = getConfig();
if (!config.hasOwnProperty('baseUrl')){
  return 1;
}

/**
 * check to see if a Monthly report has been sent
 */
const getDataValues = async (config,ouID,period) => {
  let options = {
      method: `GET`
      ,json: true
      ,uri: config.baseUrl+'/api/dataValueSets?dataSet='+DATASETUID+'&orgUnit='+ouID+'&period='+period
      ,headers: {'Authorization': config.authorization}
  };
  console.log("await");
  let res = await rp(options);
  console.log("RES",Object.keys(res));
  return res;
};

/**
 * calculatePeriod
 * Figure out what the current period under consideration should be
 * Which in general is the current month -1
 */
const calculatePeriod = () => {
  let d = new Date()
  return d.getFullYear()+''+(d.getMonth());
}

const processCHVs = async (config, users, period) => {
  let phoneNumbers = {};
  for (let user of users) {
    if (user.hasOwnProperty('organisationUnits') && user.organisationUnits.length>0){
      const dvs = await getDataValues(config,user.organisationUnits[0].id,period);
      if (!dvs.hasOwnProperty('dataValues')){
        //they did not submit for this period, add them to the list
        //make sure we don't spam someone and use up precious messages
        if (phoneNumbers.hasOwnProperty(user.phoneNumber)){
          console.error('Phone number duplication');
          //@TODO:: Notify someone about the phone# duplication
        }
        //good to go, add to sms list
        else{
          phoneNumbers[user.phoneNumber]=user.displayName;
        }
      }
      else{
        //a good person who already submitted their data for this period
      }
    }
  }
  return phoneNumbers;
};

//get all the CHVs
request({
  url: config.baseUrl+'/api/users?fields=displayName,phoneNumber,organisationUnits[id,name]&filter=userCredentials.userRoles.name:eq:CHV&paging=false',
  headers: {'Authorization': config.authorization},
  json:true
}, (e,r,b)=>{
  //check for errors
  if (e || r.statusCode != 200) {
    console.error('Failure to obtain CHVs:',e.message);
  }
  //looks good, continue
  else{
    const period = calculatePeriod();
    processCHVs(config,b.users,period).then((numbers)=>{
      //SMS all the things
      sendSMS(config,Object.keys(numbers),SMS_MESSAGE);
    });
  }
});
