/**
 *  sms_chv_monthly_nag1.js
 *  Remind all CHVs who have not submitted their Monthly CHV Stock on Hand Report for this month
 *  Usage: node sms_chv_monthly_nag1.js
  * Note: This should be placed in a cron to run 2 days after the report due date
 */

const common = require('./common');
const c = require('./constants');

const SMS_MESSAGE = 'Dear CHV, your monthly cstock report is overdue, please send immediately.';
const CHEW_MESSAGE = 'Dear CHEW, there are CHVs in your CHU who have not reported. Please look at the dashboard and follow up.';
const OU_CHV_LEVEL = 6;
const OU_CHEW_LEVEL = 5;


let dataValueSetCache = {};

let config = common.getConfig(process);
if (!config.hasOwnProperty('baseUrl')){
  return 1;
}

/**
 * calculatePeriod
 * Figure out what the current period under consideration should be
 * For cStock it is this current month since they report at the end of the month
 */
const calculatePeriod = () => {
  let d = new Date();
  return d.getFullYear()+("0" + (d.getMonth() + 1)).slice(-2);
}

const processCHVs = async (config, users, period) => {
  let numbers = {};
  for (let user of users) {
    try{
      if (user.hasOwnProperty('organisationUnits') && user.organisationUnits.length>0){

        //they might have multiple OUs. Find the one they are CHV at
        let this_ou = false;
        for (let ou of user.organisationUnits) {
          //only deal with CHVs at OUs on the bottom level
          if(ou.level==OU_CHV_LEVEL){
              this_ou = ou;
              continue;
          }
        }

        if (this_ou == false) {
          //they are associated with this OU but not as a CHV, skip to the next user
          continue;
        }

        if (user.phoneNumber == undefined){
          console.error('sms_chv_monthly_nag1 error: Phone number missing',user.id,user.displayName);
          //@TODO:: Notify someone about the missing phone#
          continue;
        }
        let phoneNumber = user.phoneNumber.replace(/ /g,'');
        if (!common.validatePhone(phoneNumber,'+254',13)){
          console.error('sms_chv_monthly_nag1 error: User phoneNumber malformed: ',user.displayName,phoneNumber);
          continue;
        }
        //make sure we don't spam someone and use up precious messages
        else if (numbers.hasOwnProperty(phoneNumber) && user.displayName==numbers[phoneNumber]){
          console.error('sms_chv_monthly_nag1 error: User assigned to multiple CHVs',user.displayName);
          continue;
          //@TODO:: Notify someone about the phone# duplication
        }
        //make sure we don't spam someone and use up precious messages
        else if (numbers.hasOwnProperty(phoneNumber)){
          console.error('sms_chv_monthly_nag1 error: Phone number duplication',user.displayName,phoneNumber);
          continue;
          //@TODO:: Notify someone about the phone# duplication
        }

        let dvs = {}
        if (dataValueSetCache.hasOwnProperty(this_ou.id+period)){
          dvs=dataValueSetCache[this_ou.id+period];
        }
        else{
          dvs = await common.getDataValueSet(c.MONTHLY_SOH_DATASETUID,this_ou.id,period,config);
          dataValueSetCache[this_ou.id+period] = dvs;
        }

        if (!dvs.hasOwnProperty('dataValues')){
          //they did NOT submit for this period, add them to the list
          //make sure we don't spam someone and use up precious messages
          if (numbers.hasOwnProperty(phoneNumber)){
            console.error('sms_chv_monthly_nag1 error: Phone number duplication',phoneNumber);
            //@TODO:: Notify someone about the phone# duplication
            continue;
          }
          //good to go, add to sms list
          numbers[phoneNumber]=user;
        }
        else{
          //a good person who already submitted their data for this period
        }
      }
    }
    catch(e){
      console.error('sms_chv_monthly_nag1 error: processCHVs user: '+user.displayName,e.message);
    }
  }
  return numbers;
};

//get all the CHVs
common.getAllWithRole('CHV', config).then(chvs=> {
  if (!chvs.hasOwnProperty('users') || chvs.users.length==0){
    throw 'No CHVs in system';
  }

  //looks good, continue
  const period = calculatePeriod();

  //get map of CHVs phone numbers who have not reported yet
  processCHVs(config,chvs.users,period).then((chvNumbers)=>{
    let sms = Object.keys(chvNumbers);
    // inform the CVH that they are tardy
    common.sendSMS(config,sms,SMS_MESSAGE);

    //get the CHEWs for those CHVs
    //cache the list of OUs so we don't spam them
    let ous = {};
    let chews = {};
    for (let number in chvNumbers) {
      //re-find the CHV site
      for (let ou of chvNumbers[number].organisationUnits) {
        if (ou.level==OU_CHV_LEVEL){
          ous[ou.parent.id]=ou.parent;
        }
      }
    }

    let oukeys = Object.keys(ous);
    for (let ouid of oukeys){
      common.getRoleAtOU(ouid, 'CHEW', config).then(chews=> {
        if (!chews.hasOwnProperty('users') || chews.users.length==0){
          throw 'OU '+ouid+' lacks a CHEW';
        }
        for (let chew of chews.users) {
          if (!chew.hasOwnProperty('phoneNumber') || chew.phoneNumber==''){
            throw 'CHEW '+chew.displayName+' lacks a phoneNumber';
          }
          let phoneNumber = chew.phoneNumber.replace(/ /g,'');
          if (!common.validatePhone(phoneNumber,'+254',13)){
            throw 'CHEW phoneNumber malformed: '+chew.displayName+ ' ' +phoneNumber;
          }
          common.sendSMS(config,[phoneNumber],CHEW_MESSAGE);
        }
      }).catch(e=>{
        console.error('sms_chv_monthly_nag1 error obtaining CHEW: ',e)
      });

    } //end chew OU loop


  }) //end processCHVs
  .catch(e =>{
    console.error("sms_chv_monthly_nag1 error: ",e);
  });

})
.catch(e=>{
  console.error('sms_chv_monthly_nag1 error: ',e);
});
