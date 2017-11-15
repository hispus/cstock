/**
 * getConfig
 * Set up the DHIS2 connection
 * @see https://docs.dhis2.org/2.26/en/developer/html/webapi_sms.html
 */
getConfig = () => {
  const dhisConfigPath = process.env.DHIS2_HOME && `${process.env.DHIS2_HOME}/config`;
  let dhisConfig;
  try {
      dhisConfig = require(dhisConfigPath);
      console.log('\nLoaded DHIS config');
  } catch (e) {
      // Failed to load config file - use default config
      console.warn(`\nWARNING! Failed to load DHIS config:`, e.message);
      console.info('Using default config');
      dhisConfig = {
          baseUrl: 'http://localhost:8080/dhis',
          authorization: 'Basic YWRtaW46ZGlzdHJpY3Q=', // admin:district
      };
  }
  return dhisConfig;
}

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
      url: config.baseUrl+'/api/26/sms/outbound',
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
          console.log("SMS Send Success");
        }
        else{
          //@TODO:: notify someone?
          console.log("SMS Send Exception:",b.message);
        }
      }
    });
  }
}
