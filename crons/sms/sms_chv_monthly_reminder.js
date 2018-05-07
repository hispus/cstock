/**
 *  sms_chv_monthly_reminder.js
 *  Get all active CHVs at sites and remind them to submit their report
 *  Usage: node sms_chv_monthly_reminder.js
 *  Note: This should be placed in a cron to run the day before the report due date
 */

const request = require('request');
const common = require('./common');


const SMS_MESSAGE = 'Dear CHV, your monthly cstock report is due in 1 day.';
const OU_CHV_LEVEL = 6;

let config = common.getConfig(process);
if (!config.hasOwnProperty('baseUrl')){
  return 1;
}

common.getAllWithRole('CHV', config).then(chvs=> {
  if (!chvs.hasOwnProperty('users') || chvs.users.length==0){
    throw 'No CHVs in system';
  }
  //set up a cache of numbers
  let numbers = {};

  for (let chv of chvs.users) {
    //make sure the CHV is assigned to a site
    if (chv.hasOwnProperty('organisationUnits') && chv.organisationUnits.length>0){
        //only accept CHVs at the appropriate OU level
        for (let ou of chv.organisationUnits){
          //strip spaces from the phoneNumber
          if (ou.level==OU_CHV_LEVEL){
            if (!chv.phoneNumber){
              console.error('sms_chv_monthly_reminder error: Phone number missing: ',chv.displayName);
              continue;
            }
            let phoneNumber = chv.phoneNumber.replace(/ /g,'');
            if (!common.validatePhone(phoneNumber,'+254',13)){
              console.error('sms_chv_monthly_reminder error: User phoneNumber malformed: ',chv.displayName,phoneNumber);
            }
            //make sure we don't spam someone and use up precious messages
            else if (numbers.hasOwnProperty(phoneNumber) && chv.displayName==numbers[phoneNumber]){
              console.error('sms_chv_monthly_reminder error: User assigned to multiple CHVs',chv.displayName);
              //@TODO:: Notify someone about the phone# duplication
            }
            //make sure we don't spam someone and use up precious messages
            else if (numbers.hasOwnProperty(phoneNumber)){
              console.error('sms_chv_monthly_reminder error: Phone number duplication',chv.displayName,numbers[phoneNumber],phoneNumber);
              //@TODO:: Notify someone about the phone# duplication
            }
            //good to go, add to sms list
            else{
              numbers[phoneNumber]=chv.displayName;
            }
          }
        }
    }
  }
  //SMS all the things
  common.sendSMS(config,Object.keys(numbers),SMS_MESSAGE);
})
.catch(e=>{
  console.error('sms_chv_monthly_reminder error: ',e.message);
});
