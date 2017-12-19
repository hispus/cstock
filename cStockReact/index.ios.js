import React, { Component } from 'react';
import {
  AppRegistry,
  Text,
  View
} from 'react-native';

import MainView from './app/components/MainView';

export default class cStockReact extends Component {
  render() {
    return (
      <View>
        <MainView/>
      </View>
    );
  }
}

AppRegistry.registerComponent('cStockReact', () => cStockReact);
