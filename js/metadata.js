/**
 * @license
 * Copyright (C) 2017 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as Branding from './branding.js';
import trim from './util.js';

const DOM_PARSER = new DOMParser();

/** Custom Error for Metadata errors */
class MetadataError extends Error {
  /**
   * Constructs new MetadataError with the given message
   *
   * @param {string} message - error message
   */
  constructor(message) {
    super(message);
    this.name = 'MetadataError';
  }
}

/** Manipulates Connected App via Metadata SOAP API */
export default class Metadata {
  /**
   * Constructs new Metadata object.
   *
   * @param {string} metadataUrl - URL to the SOAP Metadata endpoint
   * @param {string} sessionId   - sessionId used for authentication
   */
  constructor(metadataUrl, sessionId) {
    this.metadataUrl = metadataUrl;
    this.sessionId = sessionId;
  }

  /**
   * Generates OAuth Consumer key.
   *
   * @return {string} random Base64 encoded 32 byte string
   */
  _generateConsumerKey() {
    const ary = new Uint8Array(24);
    crypto.getRandomValues(ary);

    return btoa(ary);
  }

  /**
   * Generates OAuth Consumer secret.
   *
   * @return {string} random at least 20 character long numeric string
   */
  _generateConsumerSecret() {
    const rnd = function() {
      const ary = new Uint32Array(1);
      do {
        crypto.getRandomValues(ary);
      } while (ary[0] < 1000000000);

      return ary[0].toString();
    };

    return rnd() + rnd();
  }

  /**
   * Fetches node text value from DOM document and given node name.
   *
   * @param {string} xml  - the XML content
   * @param {string} name - node name
   * @return {string} the text value of the (first) node by the given name
   */
   _nodeValues(xml, name) {
     const doc = DOM_PARSER.parseFromString(xml, 'text/xml');
     const elements = doc.getElementsByTagName(name);
     if (elements.length === 0) {
       return undefined;
     }

     if (elements.length === 1) {
       return elements[0].textContent;
     }

     return Array.from(elements).map((e) => e.textContent);
   }

  /**
   * Invokes a SOAP action of the Metadata API.
   *
   * @param {string} action      - Name of the SOAP operation to invoke
   * @param {string} body        - Body of the SOAP operation
   * @return {Promise} resulting Promise containing the response
   */
  _invokeMetadataOperation(action, body) {
    const headers = new Headers();
    headers.append('Content-Type', 'text/xml');
    headers.append('SOAPAction', action);

    return fetch(this.metadataUrl, {
      method: 'POST',
      headers: headers,
      body: trim(
      `<Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/">
        <Header>
          <SessionHeader xmlns="http://soap.sforce.com/2006/04/metadata">
            <sessionId>${this.sessionId}</sessionId>
          </SessionHeader>
          <CallOptions xmlns="http://soap.sforce.com/2006/04/metadata">
            <client>${Branding.CLIENT_ID}</client>
          </CallOptions>
        </Header>
        <Body>${body}</Body>
       </Envelope>`),
    }).then((response) => {
      if (!response.ok) {
        throw new MetadataError(`Unable to create Connected App: ${response.status}: ${response.statusText}`);
      }

      return response.text().then((text) => {
        const successAry = this._nodeValues(text, 'success');
        const success = typeof successAry === 'undefined' || successAry.indexOf('true') >= 0;

        if (!success) {
          const message = this._nodeValues(text, 'message');
          const statusCode = this._nodeValues(text, 'statusCode');

          const error = new MetadataError(`${statusCode}: ${message}`);
          error.statusCode = statusCode;
          error.detail = message;

          throw error;
        }

        return new Promise((resolve, reject) => resolve(text));
      });
    });
  }

  /**
   * Creates Salesforce Connected app using the SOAP Metadata API.
   *
   * @param {{consumerKey: string, consumerSecret: string}} [options]
   *                             - Additional options
   * @return {Promise} resulting Promise
   */
  createConnectedApp(options = {}) {
    const consumerKey = options['consumerKey'] || this._generateConsumerKey();
    const consumerSecret = options['consumerSecret'] || this._generateConsumerSecret();

    const that = this;
    const createApp = function() {
      return that._invokeMetadataOperation('createMetadata',
      `<createMetadata xmlns="http://soap.sforce.com/2006/04/metadata">
        <metadata xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="ConnectedApp">
          <fullName>${Branding.CONNECTED_APP_NAME}</fullName>
          <contactEmail>${Branding.CONTACT_EMAIL}</contactEmail>
          <description>${Branding.APP_DESCRIPTION}</description>
          <infoUrl>${Branding.INFO_URL}</infoUrl>
          <label>${Branding.CONNECTED_APP_NAME}</label>
          <oauthConfig>
            <callbackUrl>https://login.salesforce.com/services/oauth2/success</callbackUrl>
            <consumerKey>${consumerKey}</consumerKey>
            <consumerSecret>${consumerSecret}</consumerSecret>
            <scopes>Api</scopes>
            <scopes>RefreshToken</scopes>
            <scopes>OfflineAccess</scopes>
          </oauthConfig>
        </metadata>
      </createMetadata>`).then((response) => {
        return new Promise((resolve, reject) => resolve({
          consumerKey: consumerKey,
          consumerSecret: consumerSecret,
        }));
      });
    };

    return this._invokeMetadataOperation('listMetadata',
    `<listMetadata xmlns="http://soap.sforce.com/2006/04/metadata">
      <queries>
        <type>ConnectedApp</type>
      </queries>
      <asOfVersion>39.0</asOfVersion>
    </listMetadata>`).then((response) => {
      const connectedApps = this._nodeValues(response, 'fullName');
      if (connectedApps && connectedApps.indexOf(Branding.CONNECTED_APP_NAME) >= 0) {
        return that.deleteConnectedApp().then(createApp);
      }

      return createApp();
    });
  }

  /**
   * Deletes Salesforce Connected app using the SOAP Metadata API.
   *
   * @return {Promise} resulting Promise
   */
  deleteConnectedApp() {
    return this._invokeMetadataOperation('deleteMetadata',
    `<deleteMetadata xmlns="http://soap.sforce.com/2006/04/metadata">
      <type>ConnectedApp</type>
      <fullNames>${Branding.CONNECTED_APP_NAME}</fullNames>
    </deleteMetadata>`).then((response) => {
      return Promise.resolve();
    });
  }
}
