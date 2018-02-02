/**
 *  sms_chv_monthly_reminder.js
 *  Get all active CHVs at sites and remind them to submit their report
 *  Usage: node sms_chv_monthly_reminder.js
 *  Note: This should be placed in a cron to run the day before the report due date
 */

const request = require('request');
const utils = require('./utils');


const SMS_MESSAGE = 'Dear CHV, your monthly cstock report is due in 1 day.';
const OU_CHV_LEVEL = 7;

let config = utils.getConfig(process);
if (!config.hasOwnProperty('baseUrl')){
  return 1;
}

request({
  url: config.baseUrl+'/api/users?fields=displayName,phoneNumber,organisationUnits[id,level,name]&filter=userCredentials.userRoles.name:eq:CHV&paging=false',
  headers: {'Authorization': config.authorization},
  json:true
}, (e,r,b)=>{
  //check for errors
  if (e || r.statusCode != 200) {
    console.error('Failure to obtain CHVs:',e.message);
  }
  //looks good, continue
  else{
    //set up a cache of numbers
    let numbers = {};
    for (let i=0; i< b.users.length; i++) {
      //make sure the CHV is assigned to a site
      if (b.users[i].hasOwnProperty('organisationUnits') && b.users[i].organisationUnits.length>0){
          //only accept CHVs at the appropriate OU level
          for (let ou of b.users[i].organisationUnits){
            if (ou.level==OU_CHV_LEVEL){
              if (!b.users[i].phoneNumber){
                console.error('sms_chv_monthly_reminder error: Phone number missing',b.users[i].displayName);
              }
              //make sure we don't spam someone and use up precious messages
              else if (numbers.hasOwnProperty(b.users[i].phoneNumber)){
                console.error('sms_chv_monthly_reminder error: Phone number duplication',b.users[i].phoneNumber);
                //@TODO:: Notify someone about the phone# duplication
              }
              //good to go, add to sms list
              else{
                numbers[b.users[i].phoneNumber]=b.users[i].displayName;
              }
            }
          }
      }
    }

    //SMS all the things
    utils.sendSMS(config,Object.keys(numbers),SMS_MESSAGE);
  }
});
