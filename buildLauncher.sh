#!/bin/bash

cd cStockReact/android
./gradlew assembleRelease

cp app/build/outputs/apk/app-armeabi-v7a-release.apk ../../cstock-launcher.apk

cd ../..



# Back to main root
cd ..
