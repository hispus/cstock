import React, { Component } from 'react';
import {
  AppRegistry,
  Text,
  View,
  Image,
  Button,
  StatusBar,
  StyleSheet
} from 'react-native';
import AppLink from 'react-native-app-link';

export default class MainView extends Component {

  constructor(props) {
    super(props);
    this.state = {error: ''};
  }

  launchDataCapture = () => {
    this.launchApp('Data Capture App','org.dhis2.mobilecstock');
  }

  launchTracker = () => {
    this.launchApp('Tracker Capture App','org.hisp.dhis.android.trackercapturecstock');
  }

  launchDashboard = () => {
    this.launchApp('Dashboard App','org.hisp.dhis.android.dashboardcstock');
  }

  launchApp = (name,url) => {
    var SendIntentAndroid = require('react-native-send-intent');
    SendIntentAndroid.isAppInstalled(url)
      .then((isInstalled) => {
        if (isInstalled) {
          SendIntentAndroid
            .openApp(url,{[url+".url"]: "cstock.baosystems.com"})
            .then((wasOpened) => {
              if (wasOpened!==true){
                this.setState({error:'Unable to open '+name});
              }
            });
        }
        else{  //go to the web store to download it
          AppLink.maybeOpenURL(url,
              { appName: name,
                playStoreId:url})
            .then(() => {
            // do stuff
          })
          .catch((err) => {
            this.setState({error:'Error trying to install '+name});
          });
        }
      });
  }

  render() {
    let showErrors = this.state.error=='' ? false : true;
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content" />

        <View style={styles.logoContainer}>
          <Image
            style={styles.logo}
            source={require('../images/cstocklogo.png')}
             />
        </View>

        <View style={styles.buttonContainer}>
          <View style={styles.buttons}>
            <Button
              style={styles.button}
              title='StockOut'
              onPress={this.launchTracker} />
            <Text> </Text>
            <Button
              style={styles.button}
              title='SOH &amp; Resupply'
              onPress={this.launchDataCapture} />
            <Text> </Text>
            <Button
              style={styles.button}
              title='Dashboard'
              onPress={this.launchDashboard} />
          </View>
        </View>

        {(showErrors)?
          <View style={styles.messages}>
          <Text style={styles.errors}>
            {this.state.error}
          </Text>
        </View>
        :null}

        <View style={styles.sealContainer}>
          <View style={styles.seals}>
            <Image
              style={styles.seal}
              source={require('../images/mohlogo.png')}
               />
            <Image
              style={styles.seal}
              source={require('../images/jsilogo.png')}
               />
            <Image
              style={styles.seal}
              source={require('../images/uiologo.png')}
               />
           </View>
         </View>
       </View>
    );
  }
}

const styles = StyleSheet.create({
  container:{
    backgroundColor: '#fff',
    flex:1
  },
  logoContainer:{
    alignItems: 'center',
    flexGrow: 6,
    justifyContent: 'center',
    margin:10
  },
  sealContainer:{
    alignItems: 'center',
    backgroundColor: '#fff',
    marginTop:10,
    marginBottom:10,
  },
  seals:{
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginRight:10,
    marginLeft:10,
    width:250
  },
  buttonContainer:{
    alignItems: 'center',
    flexGrow: 1,
    flexDirection: 'column',
    margin:20,
    backgroundColor:'#fff'
  },
  buttons:{
    alignItems: 'center',
    flexDirection: 'column',
    flexGrow: 1,
    justifyContent: 'space-between',
    marginLeft:20,
    marginRight:20
  },
  button:{
    marginLeft:5,
    paddingLeft:5,
    width:100
  },
  logo:{
    width:300,
    height:75
  },
  seal:{
    width:50,
    height:50,
    margin:2,
    marginLeft:20,
    marginRight:20,
  },
  messages:{
    margin:3,
    flexGrow:1,
    backgroundColor:'#fff',
    alignItems:'center'
  },
  errors:{
    color:'#f00',
  }
});

AppRegistry.registerComponent('MainView', () => MainView);
