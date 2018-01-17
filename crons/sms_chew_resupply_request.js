/**
 *  sms_chew_resupply_request.js
 *  Let the CHEW know that a CHV needs supplies
 */

const request = require('request');
const rp = require('request-promise-native');

require('./utils');

const SMS_MESSAGE = 'Dear CHEW, [CHV_name] requires the following supplies: [SUPPLIES]. Please record on your resupply worksheet.';
const REPORT_UID = 'XYWsxvJwgwp';

const TEST_MODE = false;

const TEST_DATA = {"title":"03 CHV Resupply - This Month","subtitle":"January 2018","headers":[{"name":"Organisation unit ID","column":"organisationunitid","valueType":"TEXT","type":"java.lang.String","hidden":true,"meta":true},{"name":"Organisation unit","column":"organisationunitname","valueType":"TEXT","type":"java.lang.String","hidden":false,"meta":true},{"name":"Organisation unit code","column":"organisationunitcode","valueType":"TEXT","type":"java.lang.String","hidden":true,"meta":true},{"name":"Organisation unit description","column":"organisationunitdescription","valueType":"TEXT","type":"java.lang.String","hidden":true,"meta":true},{"name":"Reporting month","column":"reporting_month_name","valueType":"TEXT","type":"java.lang.String","hidden":true,"meta":true},{"name":"Organisation unit parameter","column":"param_organisationunit_name","valueType":"TEXT","type":"java.lang.String","hidden":true,"meta":true},{"name":"Organisation unit is parent","column":"organisation_unit_is_parent","valueType":"TEXT","type":"java.lang.String","hidden":true,"meta":true},{"name":"RDT Resupply","column":"rdt resupply","valueType":"NUMBER","type":"java.lang.Double","hidden":false,"meta":false},{"name":"ACT 6s Resupply","column":"act 6s resupply","valueType":"NUMBER","type":"java.lang.Double","hidden":false,"meta":false},{"name":"ACT 12s Resupply","column":"act 12s resupply","valueType":"NUMBER","type":"java.lang.Double","hidden":false,"meta":false},{"name":"ACT 18s Resupply","column":"act 18s resupply","valueType":"NUMBER","type":"java.lang.Double","hidden":false,"meta":false},{"name":"ACT 24s Resupply","column":"act 24s resupply","valueType":"NUMBER","type":"java.lang.Double","hidden":false,"meta":false},{"name":"Zinc/ORS Resupply","column":"zincors resupply","valueType":"NUMBER","type":"java.lang.Double","hidden":false,"meta":false},{"name":"Albendazole Resupply","column":"albendazole resupply","valueType":"NUMBER","type":"java.lang.Double","hidden":false,"meta":false},{"name":"Male Condoms Resupply","column":"male condoms resupply","valueType":"NUMBER","type":"java.lang.Double","hidden":false,"meta":false},{"name":"Paracetamol Resupply","column":"paracetamol resupply","valueType":"NUMBER","type":"java.lang.Double","hidden":false,"meta":false}],"rows":[
  ["HfVjCurKxh2","Kenya","","","January 2018","","No","","","","","","","","",""],
  ["uRvG3cD2BWn","Kituro CHV 01","","","January 2018","","No","1","","","","","","","",""]
],"width":16,"height":1}

let config = getConfig();
if (!config.hasOwnProperty('baseUrl')){
  return 1;
}

/**
 * get a pivot table report
 */
const getReportTable = async (UID) => {

  if (TEST_MODE==true){
    return TEST_DATA;
  }

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
 * Find the CHEW attached to this OU
 * @param UID string
 */
const getChew = async (UID) => {
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
 * Find the CHV for this OU
 * @param UID string
 */
const getCHV = async (UID) => {
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
    //get the chv name for this OU
    getCHV(ouid).then(chvs =>{

      if (!chvs.hasOwnProperty('users') || chvs.users.length==0){
        console.error('sms_chew_resupply_request error: CHV processing: No CHV for OU '+ouid);
        return;
      }

      //@NOTE: Assume 1 CHV per OU
      let chv = chvs.users[0];
      let ou = false;
      //BUT! They might have multiple OUs, so we need to re-find this OU...
      for (let o=0; o<chv.organisationUnits.length; o++){
        if (chv.organisationUnits[o].id==ouid){
          ou = chv.organisationUnits[o];
          break;
        }
      }
      if (ou == false){
        console.error('sms_chew_resupply_request error: CHV processing: Could not re-find CHV\'s OU: '+ ouid);
        return false;
      }
      if (!ou.hasOwnProperty('parent')){
        console.error('sms_chew_resupply_request error: CHV processing: Could not find parent of CHV\'s OU: '+ ouid);
        return false;
      }

      //get the CHEW for this OU by getting the parent
      getChew(ou.parent.id).then(res=> {
        if (res.hasOwnProperty('users') && res.users.length>0 ) {
          let message = SMS_MESSAGE;
          //replace [CHV_name]
          let ou = row[1];
          message = message.replace('[CHV_name]',chv.displayName);
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
              if (TEST_MODE==true){
                console.log('TEST MODE: WOULD SEND TO ',res.users[u].phoneNumber,message);
              }
              else{
                sendSMS(config,res.users[u].phoneNumber,message);
              }

            }
            else{
              console.error('sms_chew_resupply_request error: CHEW missing phoneNumber: '+res.users[u].displayName);
            }
          }
        }
      })
      .catch(e=>{
        console.error('sms_chew_resupply_request error',e);
      });

    })
    .catch(e=>{
      console.error('sms_chew_resupply_request error: CHV processing: ',e);
    })
  }
})
.catch(e=>{
  console.error('sms_chew_resupply_request error',e);
});
