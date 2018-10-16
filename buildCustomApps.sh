#!/bin/bash
# cStock DHIS2 server
SERVER="https://cstock.baosystems.com"
# Tracker Capture
TC=org.hisp.dhis.android.trackercapture
TC_C=org.hisp.dhis.android.trackercapturecstock
# Data Capture
DC=org.dhis2.mobile
DC_C=org.dhis2.mobilecstock
# Dashboard
DB=org.hisp.dhis.android.dashboard
DB_C=org.hisp.dhis.android.dashboardcstock

[[ -d core-apps ]] || mkdir core-apps
cd core-apps

# Get the code
[[ -d dhis2-android-dashboard ]] || git clone --recursive git@github.com:dhis2/dhis2-android-dashboard.git
cd dhis2-android-dashboard
git pull
# adjust the names
sed -i '' "s#\"$DB\"#\"$DB_C\"#g" app/build.gradle
sed -i '' "s#\>DHIS2 Dashboard#\>cStock DHIS2 Dashboard#" app/src/main/res/values/strings.xml
sed -i '' "s#ButterKnife.bind(this);#ButterKnife.bind(this); mServerUrl.setText(\"$SERVER\");#" app/src/main/java/org/hisp/dhis/android/dashboard/ui/activities/LoginActivity.java

# replace some icons
cp ../../images/dashboard/mipmap-hdpi/* app/src/main/res/mipmap-mdpi/
cp ../../images/dashboard/mipmap-mdpi/* app/src/main/res/mipmap-hdpi/
cp ../../images/dashboard/mipmap-xhdpi/* app/src/main/res/mipmap-xhdpi/
cp ../../images/dashboard/mipmap-xxhdpi/* app/src/main/res/mipmap-xxhdpi/
# build
./gradlew build
cp app/build/outputs/apk/app-debug.apk ../dashboard-cstock.apk
#cp app/build/outputs/apk/app-release-unsigned.apk ../dashboard-cstock.apk
cd ..


[[ -d dhis2-android-datacapture ]] || git clone --recursive git@github.com:dhis2/dhis2-android-datacapture.git
cd dhis2-android-datacapture
git pull
# adjust the names
sed -i '' "s#\"$DC\"#\"$DC_C\"#g" dhis2-android-app/build.gradle
sed -i '' "s#DHIS2 Data Capture#cStock DHIS2 Resupply#" dhis2-android-app/src/main/res/values/strings.xml
sed -i '' "s#.*mServerUrl.addTextChangedListener.*#mServerUrl.setText(\"$SERVER\"); &#" dhis2-android-app/src/main/java/org/dhis2/mobile/ui/activities/LoginActivity.java
# replace some icons
cp ../../images/dashboard/mipmap-hdpi/* dhis2-android-app/src/main/res/drawable-hdpi/
cp ../../images/dashboard/mipmap-mdpi/* dhis2-android-app/src/main/res/drawable-mdpi/
cp ../../images/dashboard/mipmap-xhdpi/* dhis2-android-app/src/main/res/drawable-xhdpi/
cp ../../images/dashboard/mipmap-xxhdpi/* dhis2-android-app/src/main/res/drawable-xxhdpi/
# build
./gradlew build
cp dhis2-android-app/build/outputs/apk/dhis2-android-app-debug.apk ../datacapture-cstock.apk
#cp dhis2-android-app/build/outputs/apk/dhis2-android-app-release-unsigned.apk ../datacapture-cstock.apk
cd ..

# --------- TRACKER CAPTURE --------------------------------------------
[[ -d dhis2-android-trackercapture ]] || git clone --recursive git@github.com:dhis2/dhis2-android-trackercapture.git
cd dhis2-android-trackercapture
git pull
# adjust the names
sed -i '' "s#\"$TC\"#\"$TC_C\"#" app/build.gradle
sed -i '' "s#\"$TC\"#\"$TC_C\"#g" build.gradle
sed -i '' "s#\"$TC\"#\"$TC_C\"#" app/src/main/java/org/hisp/dhis/android/trackercapture/MainActivity.java
sed -i '' "s#\"$DC\"#\"$DC_C\"#" app/src/main/java/org/hisp/dhis/android/trackercapture/MainActivity.java
sed -i '' "s#\"$DB\"#\"$DB_C\"#" app/src/main/java/org/hisp/dhis/android/trackercapture/MainActivity.java
sed -i '' "s#DHIS2 Tracker#cStock DHIS2 StockOut#" sdk/core/src/main/res/values/strings.xml
sed -i '' "s#DHIS2 Tracker#cStock DHIS2 StockOut#" sdk/core/src/main/res/values/strings.xml~
sed -i '' "s#DHIS 2 Tracker Capture#cStock DHIS2 StockOut#" sdk/core/src/main/res/values/strings.xml~
sed -i '' "s#DHIS2 Tracker#cStock DHIS2 StockOut#" sdk/core/src/main/res/values-fr/strings.xml
sed -i '' "s#DHIS2 Tracker#cStock DHIS2 StockOut#" sdk/core/src/main/res/values-es/strings.xml
sed -i '' "s#DHIS 2 Tracker Capture#cStock DHIS2 StockOut#" sdk/core/src/main/res/values/donottranslate.xml
sed -i '' "s#DHIS 2 Tracker Capture#cStock DHIS2 StockOut#" app/src/main/res/values/donottranslate.xml
sed -i '' "s#DHIS 2 Tracker Capture#cStock DHIS2 StockOut#" app/src/main/res/values/strings.xml~
sed -i '' "s#server = \"https:\/\/\"#server = \"$SERVER\"#" sdk/core/src/main/java/org/hisp/dhis/android/sdk/ui/activities/LoginActivity.java
# replace some icons
cp ../../images/trackercapture/mipmap-hdpi/* app/src/main/res/drawable-hdpi/
cp ../../images/trackercapture/mipmap-mdpi/* app/src/main/res/drawable-mdpi/
cp ../../images/trackercapture/mipmap-xhdpi/* app/src/main/res/drawable-xhdpi/
cp ../../images/trackercapture/mipmap-xxhdpi/* app/src/main/res/drawable-xxhdpi/
# build
./gradlew build
cp app/build/outputs/apk/app-debug.apk ../trackercapture-cstock.apk
#cp app/build/outputs/apk/app-release-unsigned.apk ../trackercapture-cstock.apk
cd ..


# Back to main root
cd ..
