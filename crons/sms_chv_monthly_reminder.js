/**
 *  sms_chv_monthly_reminder.js
 *  Get all active CHVs at sites and remind them to submit their report
 */

const request = require('request');
require('./utils');


const SMS_MESSAGE = 'SMS TEST from Greg';

let config = getConfig();
if (!config.hasOwnProperty('baseUrl')){
  return 1;
}

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
    let numbers = {};
    for (let i=0; i< b.users.length; i++) {
      //make sure the CHV is assigned to a site
      if (b.users[i].hasOwnProperty('organisationUnits') && b.users[i].organisationUnits.length>0){
          //make sure we don't spam someone and use up precious messages
          if (numbers.hasOwnProperty(b.users[i].phoneNumber)){
            console.error('Phone number duplication');
            //@TODO:: Notify someone about the phone# duplication
          }
          //good to go, add to sms list
          else{
            numbers[b.users[i].phoneNumber]=b.users[i].displayName;
          }
      }
    }

    //SMS all the things
    sendSMS(config,Object.keys(numbers),SMS_MESSAGE);
  }
});
