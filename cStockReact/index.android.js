import React, { Component } from 'react';
import {
  AppRegistry,
  Text,
  View,
  StyleSheet
} from 'react-native';

import MainView from './app/components/MainView';

export default class cStockReact extends Component {
  render() {
    return (
      <View style={styles.container}>
        <MainView />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container:{
    flex: 1,
    backgroundColor:'#2c3e50'
  }
});

AppRegistry.registerComponent('cStockReact', () => cStockReact);
