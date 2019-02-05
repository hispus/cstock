# cstock

## Custom DHIS2 Apps

Directory: ` `

`buildProductionApps.sh`: Will pull down the 2.29 branch of DHIS2 Android apps and replace particular pieces to allow for *production* cStock deployment.

`buildCustomApps.sh`: Will pull down the 2.29 branch of DHIS2 Android apps and replace particular pieces to allow for *development* cStock deployment.

`buildLauncher.sh`: Creates an Android app used to launch the custom Android apps.

## SMSBRIDGE

Directory: `smsbridge`

The SMS bridge is a cludge to enable AfricasTalking SMS Api to properly insert data into DHIS2.

*Deployment*

1. Place the `index.php` file into the webroot of the server.
1. Copy `config.php.default` to `config.php` and edit the values accordingly.
1. Log into [AfricasTalking api](https://account.africastalking.com/auth/login) to point their POST to the server you deployed this to.


## SMS Cron Jobs

Directory: `crons/sms`

A series of SMS reminders and nags

Consult the `README.md` file located there.

## cStock DHIS2 Launcher

Directory: `cStockReact`

A ReactJS based Android app that launches the custom built cStock DHIS2 apps.
Build script is in root directory.

## cStock Analytics update

File: cstock-daily.py

A python3 script to run daily, performing two tasks: (1) If monthly stocks have been received against a stockout, it automatically closes out the stockout, (2) Runs the cstock predictors, so the DHIS2 analytics data is up to date.
