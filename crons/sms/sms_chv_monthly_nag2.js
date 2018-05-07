/**
 *  sms_chv_monthly_nag2.js
 *  Remind all CHEW & Health Facility In Charges who have CHVs which have not submitted their Monthly CHV Stock on Hand Report for the previous month
 *  Usage: node sms_chv_monthly_nag2.js
  * Note: This should be placed in a cron to run 5 days after the report due date
 */

const common = require('./common');
const c = require('./constants');

const CHEW_MESSAGE = 'Dear CHEW, there are CHVs in your CHU who have not reported. Please look at the dashboard and follow up.';
const HFIC_MESSAGE = 'Dear HFIC, there are CHVs in your CHU who have not reported. Please look at the dashboard and follow up.';
const OU_CHV_LEVEL = 6;
const OU_CHEW_LEVEL = 5;
const OU_HFIC_LEVEL = 4;

let dataValueSetCache = {};

let config = common.getConfig(process);
if (!config.hasOwnProperty('baseUrl')){
  return 1;
}

/**
 * calculatePeriod
 * Figure out what the current period under consideration should be
 * Which in this case is for month -1 since the reports are requested late in the month
 */
const calculatePeriod = () => {
  let d = prevMonth(new Date());
  return d.getFullYear()+("0" + (d.getMonth() + 1)).slice(-2);
}

/**
 * This is copied straight from sms_chv_monthly_nag2 but the error strings have
 * been updated
 */
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

        //irrelevant if the chv has a phone number since we are notifying the CHEW/HFIC
        // if (user.phoneNumber == undefined){
        //   console.error('sms_chv_monthly_nag2 error: Phone number missing',user.id,user.displayName);
        //   //@TODO:: Notify someone about the missing phone#
        //   continue;
        // }

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
          //good to go, add to sms list
          numbers[user.phoneNumber]=user;
        }
        else{
        }
      }
    }
    catch(e){
      console.error('sms_chv_monthly_nag2 error: processCHVs user: '+user.displayName,e.message);
    }
  }
  return numbers;
};

//get all the CHVs
common.getAllWithRole('CHV', config).then(chvs=> {
  if (!chvs.hasOwnProperty('users') || chvs.users.length==0){
    throw 'No CHVs in system';
  }

  const period = calculatePeriod();

  //get map of CHVs phone numbers who have not reported yet
  processCHVs(config,chvs.users,period).then((chvNumbers)=>{
    // The CHVs themselves are not notified in this nag, but we need them to figure out who they report to

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
    let ous_hfic = {};
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
        console.error('sms_chv_monthly_nag2 error obtaining CHEW: ',e)
      });
      //record the HFIC OU while we are here
      ous_hfic[ous[ouid].parent.id]=ous[ouid].parent;
    } //end chew OU loop

    //get the HFIC contact
    let hcifkeys = Object.keys(ous_hfic);
    for (let ouid of oukeys){
      common.getRoleAtOU(ouid, 'HFIC', config).then(hfics=> {
        if (!hfics.hasOwnProperty('users') || hfics.users.length==0){
          throw 'OU '+ouid+' lacks a HFIC';
        }
        for (let hfic of hfics.users) {
          if (!hfic.hasOwnProperty('phoneNumber') || hfic.phoneNumber==''){
            throw 'HFIC '+hfic.displayName+' lacks a phoneNumber';
          }
          let phoneNumber = hfic.phoneNumber.replace(/ /g,'');
          if (!common.validatePhone(phoneNumber,'+254',13)){
            throw 'HFIC phoneNumber malformed: '+hfic.displayName+ ' ' +phoneNumber;
          }
          common.sendSMS(config,[phoneNumber],HFIC_MESSAGE);
        }
      }).catch(e=>{
        console.error('sms_chv_monthly_nag2 error obtaining HFIC: ',e)
      });
    } //end HFIC OU loop

  }) //end processCHVs
  .catch(e =>{
    console.error("sms_chv_monthly_nag2 error: ",e);
  });

})
.catch(e=>{
  console.error('sms_chv_monthly_nag2 error: ',e);
});
