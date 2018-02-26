/**
 * esp-adapter.js - Web server adapter implemented as a plugin.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

const Adapter = require('../adapter');
const Device = require('../device');
const Property = require('../property');
const fetch = require('node-fetch');

class ESPProperty extends Property {
  constructor(device, name, propertyDescription) {
    super(device, name, propertyDescription);
    this.unit = propertyDescription.unit;
    this.description = propertyDescription.description;
    this.device = device;

    this.setCachedValue(propertyDescription.value);
    this.device.notifyPropertyChanged(this);
    let url = this.device.url;

    url = this.device.url + this.href;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.send(data);

  }

  /**
   * @method setValue
   * @returns a promise which resolves to the updated value.
   *
   * @note it is possible that the updated value doesn't match
   * the value passed in.
   */

  setValue(value) {
      
    return new Promise((resolve, reject) => {
      let url=this.device.url;

      // set value but allow override in response.
      this.setCachedValue(value);
      resolve(value);
      this.device.notifyPropertyChanged(this);

      url = this.device.url + this.href;
      var xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Content-type", "application/json");
      xhr.send(data);
    });
  }
}

class ESPDevice extends Device {
  constructor(adapter, id, name, type, description, url, properties) {
    super(adapter, id);

    this.url = url;
    this.name = name;
    this.type = type;
    this.description = description;

    console.log("Adding device at "+url);
    // properties are set by a json response from the actual device
    let keys = Object.keys(properties);
    let values = Object.values(properties); 
    for (var i=0; i<keys.length; i++) {
      this.properties.set(keys[i], new ESPProperty(this, keys[i], values[i]));
    }
  }
}

class ESPAdapter extends Adapter {
  constructor(addonManager, packageName, manifest) {
    super(addonManager, 'ESPAdapter', packageName);
    addonManager.addAdapter(this);
    this.manifest = manifest;
  }

  async tryDevice(url, i) {
    console.log("Trying "+url);
    try {
      let response = await fetch(url);
      if (!response.ok) // or check for response.status
          throw new Error(response.statusText);
      let thingResponse = await response.json();
      let name = thingResponse['name'];
      let id = this.name + "-" + i;
      if( thingResponse['description'] )
        let description = thingResponse['description'];
      else
        let description = '';
      let type = thingResponse['type'];
      this.handleDeviceAdded(new ESPDevice(this, id, name, type, description, url, thingResponse['properties']));
    } catch(err) {
      //console.log('tryDevice err:+'+err);
    }
  }

  startPairing(timeoutSeconds) {
    console.log(this.name, 'id', this.id, 'pairing started');

    var ipStart = this.manifest.moziot.config.ipStart;
    var ipStartSplit = ipStart.split(".");
    var ipEnd = this.manifest.moziot.config.ipEnd;
    var ipEndSplit = ipEnd.split(".");

    var url="";
    var thingUser = this.manifest.moziot.config.thingUser;
    var thingPwd = this.manifest.moziot.config.thingPwd;

    console.log("Pairing "+ipStartSplit[3]+" to "+ipEndSplit[3]);
    for(var i=ipStartSplit[3]; i<=ipEndSplit[3]; i++) {
      if( thingUser ) {
        url = "http://"+thingUser+":"+thingPwd+"@"+ipStartSplit[0]+"."+ipStartSplit[1]+"."+ipStartSplit[2]+"."+i+"/things/esp";
      }
      else {
        url = "http://"+ipStartSplit[0]+"."+ipStartSplit[1]+"."+ipStartSplit[2]+"."+i+"/things/esp";
      }

      this.tryDevice(url, i);
    }
  }
}

function loadESPAdapter(addonManager, manifest, _errorCallback) {
  let adapter = new ESPAdapter(addonManager, manifest.name, manifest);
}

module.exports = loadESPAdapter;
