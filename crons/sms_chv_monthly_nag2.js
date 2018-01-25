/**
 *  sms_chv_monthly_nag2.js
 *  Remind all CHVs who have not submitted their Monthly CHV Stock on Hand Report
 *  Usage: node sms_chv_monthly_nag2.js
  * Note: This should be placed in a cron to run 2 days after the report due date
 */

const request = require('request');
const rp = require('request-promise-native');
const utils = require('./utils');

const SMS_MESSAGE = 'Dear CHV, your monthly cstock report is overdue, please send immediately.';
const CHEW_MESSAGE = 'Dear CHEW, there are CHVs in your CHU who have not reported. Please look at the dashboard and follow up.';
const HFIC_MESSAGE = 'Dear HFIC, there are CHVs in your CHU who have not reported. Please look at the dashboard and follow up.';

const OU_CHV_LEVEL = 6;
const OU_CHEW_LEVEL = 5;
const OU_HFIC_LEVEL = 4;

let dataValueSetCache = {};

let config = utils.getConfig(process);
if (!config.hasOwnProperty('baseUrl')){
  return 1;
}

/**
 * calculatePeriod
 * Figure out what the current period under consideration should be
 * Which in general is the current month -1
 */
const calculatePeriod = () => {
  let d = prevMonth(new Date());

  return d.getFullYear()+''+d.getMonth();
}

/**
 * This is copied straight from sms_chv_monthly_nag2 but the error strings have
 * been updated
 */
const processCHVs = async (config, users, period) => {
  let phoneNumbers = {};
  for (let user of users) {
    userloop:  //label for breaking
    try{
      if (user.hasOwnProperty('organisationUnits') && user.organisationUnits.length>0){
        //they might have multiple OUs. Find the one they are CHV at
        let this_ou = false;
        for (let ou of user.organisationUnits) {
          //only deal with CHVs at OUs on the bottom level
          if(ou.level!=OU_CHV_LEVEL){
              continue;
          }
          ouloop:
          for (let u of ou.users) {
            if (u.id=user.id){
              if (u.hasOwnProperty('userCredentials') && u.userCredentials.hasOwnProperty('userRoles') && u.userCredentials.userRoles.length>0){
                for (let ur of u.userCredentials.userRoles) {
                  if (ur.name==='CHV'){
                    this_ou = ou;
                    break ouloop;
                  }
                }
              }
            }
          }
        }
        if (this_ou == false) {
          //they are associated with this OU but not as a CHV, skip to the next user
          continue;
        }

        if (user.phoneNumber == undefined){
          console.error('sms_chv_monthly_nag2 error: Phone number missing',user.id,user.displayName);
          //@TODO:: Notify someone about the missing phone#
          continue;
        }
        let dvs = {}
        if (dataValueSetCache.hasOwnProperty(this_ou.id+period)){
          dvs=dataValueSetCache[ouID+period];
        }
        else{
          dvs = await utils.getMonthlySOHReports(config,this_ou.id,period);
          dataValueSetCache[this_ou.id+period] = dvs;
        }
        if (!dvs.hasOwnProperty('dataValues')){
          //they did NOT submit for this period, add them to the list
          //make sure we don't spam someone and use up precious messages
          if (phoneNumbers.hasOwnProperty(user.phoneNumber)){
            console.error('sms_chv_monthly_nag2 error: Phone number duplication',user.phoneNumber);
            //@TODO:: Notify someone about the phone# duplication
            continue;
          }
          //good to go, add to sms list
          phoneNumbers[user.phoneNumber]=user;
        }
        else{
        }
      }
    }
    catch(e){
      console.error('sms_chv_monthly_nag2 error: processCHVs user: '+user.displayName,e.message);
    }
  }
  return phoneNumbers;
};

//get all the CHVs
request({
  url: config.baseUrl+'/api/users?fields=id,displayName,phoneNumber,organisationUnits[id,name,level,users[id,userCredentials[user.id,userRoles[name]]],parent[id,name,level,parent[id,name,level]]]&filter=userCredentials.userRoles.name:eq:CHV&paging=false',
  headers: {'Authorization': config.authorization},
  json:true
}, (e,r,b)=>{
  //check for errors
  if (e || r.statusCode != 200) {
    console.error('sms_chv_monthly_nag2 error: Failure to obtain CHVs:',r.statusCode,r.statusMessage);
  }
  //looks good, continue
  else{
    const period = calculatePeriod();
    //get map of CHVs phone numbers who have not reported yet
    processCHVs(config,b.users,period).then((chvNumbers)=>{
      // let sms = Object.keys(chvNumbers);
      // // inform the CVH that they are tardy
      // utils.sendSMS(config,sms,SMS_MESSAGE);

      //get the CHEWs for those CHVs
      //cache the list of OUs so we don't spam them
      let ous = {};
      let ous_hfic = {};
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
        utils.getChew(ouid,config).then(chews=>{
          if (!chews.hasOwnProperty('users') || chews.users.length==0){
            throw 'OU '+ouid+' lacks a CHEW';
          }
          for (let chew of chews.users) {
            if (!chew.hasOwnProperty('phoneNumber') || chew.phoneNumber==''){
              throw 'CHEW '+chew.displayName+' lacks a phoneNumber';
            }
            utils.sendSMS(config,[chew.phoneNumber],CHEW_MESSAGE);
          }
        }).catch(e=>{
          console.error('sms_chv_monthly_nag2 error obtaining CHEW: ',e)
        });
        //record the HFIC OU while we are here
        ous_hfic[ous[ouid].parent.id]=ous[ouid].parent;
      }
      //get the HFIC contact
      let hcifkeys = Object.keys(ous_hfic);
      for (let ouid of oukeys){
        utils.getHFIC(ouid,config).then(hfics=>{
          if (!hfics.hasOwnProperty('users') || hfics.users.length==0){
            throw 'OU '+ouid+' lacks a HFIC';
          }
          for (let hfic of hfics.users) {
            if (!hfic.hasOwnProperty('phoneNumber') || hfic.phoneNumber==''){
              throw 'HFIC '+hfic.displayName+' lacks a phoneNumber';
            }
            utils.sendSMS(config,[hfic.phoneNumber],HFIC_MESSAGE);
          }
        }).catch(e=>{
          console.error('sms_chv_monthly_nag2 error obtaining HFIC: ',e)
        });
      }

    })
    .catch(e =>{
      console.error("sms_chv_monthly_nag2 error: ",e);
    });
  }
});
