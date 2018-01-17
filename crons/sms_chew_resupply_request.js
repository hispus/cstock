/**
 *  sms_chew_resupply_request.js
 *  Let the CHEW know that a CHV needs supplies
 */

const request = require('request');
const rp = require('request-promise-native');

require('./utils');

const SMS_MESSAGE = 'Dear CHEW, [CHV_name] requires the following supplies: [SUPPLIES]. Please record on your resupply worksheet.';
const REPORT_UID = 'XYWsxvJwgwp';

let config = getConfig();
if (!config.hasOwnProperty('baseUrl')){
  return 1;
}

/**
 * get a pivot table report
 */
const getReportTable = async (UID) => {
  let options = {
      method: `GET`
      ,json: true
      ,uri: config.baseUrl+'/api/reportTables/'+UID+'/data.json'
      ,headers: {'Authorization': config.authorization}
  };
  let res = await rp(options);
  return res;
};

/**
 * Figure out the resupply columns of the returned report
 * @param json Object
 * @param codes Object
 */
const indexColumns = (json,codes) => {
  let columns = {};
  let code_keys = Object.keys(codes);

  for (let i=0; i < json.headers.length; i++) {
    for (let j = 0; j<code_keys.length; j++){
      if (json.headers[i].name == (code_keys[j]+ ' Resupply')){
        columns[code_keys[j]]=i;
      }
    }
  }
  return columns;
};

/**
 * Find the CHEW responsible for this OU
 * @param UID string
 */
const getParentChew = async (UID) => {
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
 * Was any useful data given in the report
 * @param cols Object
 * @param data Array The report data for one CHV
 */
const needsResupply = (cols,data) => {
  let needs = false;
  //get the columns that should have data
  let lookup = Object.values(cols);
  //see if anything actually has data
  for (let i=0; i<lookup.length; i++){
    if (data[lookup[i]]!=''){
      needs = true;
    }
  }
  return needs;
}

//**-------------------------------------------------------------------  MAIN  -

getReportTable(REPORT_UID).then(res=> {
  let columns = indexColumns(res,PRODUCT_CODES);
  for (let i=0; i<res.rows.length; i++){
    const row = res.rows[i];
    const ouid = row[0];
    //do they have any resupply needs?
    if (!needsResupply(columns,row)){
      continue;
    }
    //get the chv name for this OU::!!  DEPENDS ON RESPONSE FROM GERTRUDE (currently using the OU name instead)
    //get the CHEW for this OU by getting the parent
    getParentChew(ouid).then(res=> {
      if (res.hasOwnProperty('users') && res.users.length>0 ) {
        let message = SMS_MESSAGE;
        //replace [CHV_name]
        let ou = row[1];
        message = message.replace('[CHV_name]',ou);
        //replace [SUPPLIES]
        let supplies = '';
        let lookup = Object.keys(columns);
        //see if anything actually has data
        for (let i=0; i<lookup.length; i++){
          let pc = PRODUCT_CODES[lookup[i]];
          let q = row[columns[lookup[i]]];
          if (q!=''){
            supplies = supplies + '|' + pc + ':' + q;
          }
        }
        supplies = supplies + '|';
        message = message.replace('[SUPPLIES]',supplies);
        for (let u=0; u<res.users.length; u++){
          if (res.users[u].phoneNumber){
            // console.log('SENDING TO ',res.users[u].phoneNumber,message);
              sendSMS(config,res.users[u].phoneNumber,message);
          }
          else{
            console.error('sms_chew_resupply_request  error: CHEW missing phoneNumber: '+res.users[u].displayName);
          }
        }
      }
    })
    .catch(e=>{
      console.error('sms_chew_resupply_request error',e);
    });
  }
})
.catch(e=>{
  console.error('sms_chew_resupply_request error',e);
});
