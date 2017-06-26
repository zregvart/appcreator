// Copyright (C) 2017 Red Hat, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//         http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/** Handles Connected App creation via Metadata SOAP API */

/**
 * Generates OAuth Consumer key.
 *
 * @return {string} random Base64 encoded 32 byte string
 */
function _generateConsumerKey() {
    const ary = new Uint8Array(32);
    crypto.getRandomValues(ary);

    return btoa(ary);
}

/**
 * Generates OAuth Consumer secret.
 *
 * @return {string} random at least 20 character long numeric string
 */
function _generateConsumerSecret() {
    const rnd = function() {
        let ary = new Uint32Array(1);
        do {
            crypto.getRandomValues(ary);
        } while (ary[0] < 1000000000);

        return ary[0].toString();
    };

    return rnd() + rnd();
}

/**
 * Creates Salesforce Connected app using the SOAP Metadata API.
 *
 * @param {string} metadataUrl - URL to the SOAP Metadata API port
 * @param {string} sessionId   - Salesforce sessionId used for authentication
 * @param {{consumerKey: string, consumerSecret: string}} [options]
 *                             - Additional options
 * @return {Promise} resulting Promise
 */
function createConnectedApp(metadataUrl, sessionId, options = {}) {
    const headers = new Headers();
    headers.append('Content-Type', 'text/xml');
    headers.append('SOAPAction', 'createMetadata');

    const consumerKey = options['consumerKey'] || _generateConsumerKey();
    const consumerSecret = options['consumerSecret'] || _generateConsumerSecret();

    const soapTemplate = `<Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/">
<Header>
<SessionHeader xmlns="http://soap.sforce.com/2006/04/metadata">
<sessionId>${sessionId}</sessionId>
</SessionHeader>
<CallOptions xmlns="http://soap.sforce.com/2006/04/metadata">
<client>Syndesis</client>
</CallOptions>
</Header>
<Body>
<createMetadata xmlns="http://soap.sforce.com/2006/04/metadata">
<ConnectedApp>
<fullName>FuseApp</fullName>
<contactEmail>support@redhat.com</contactEmail>
<description>
Salesforce Connected App used for integration with RedHat Fuse middleware.
</description>
<infoUrl>https://www.redhat.com/en/technologies/jboss-middleware/fuse</infoUrl>
<label>FuseApp</label>
<oauthConfig>
<callbackUrl></callbackUrl>
<certificate></certificate>
<consumerKey>${consumerKey}</consumerKey>
<consumerSecret>${consumerSecret}</consumerSecret>
<scopes>
<ConnectedAppOauthAccessScope>Api</ConnectedAppOauthAccessScope>
<ConnectedAppOauthAccessScope>RefreshToken</ConnectedAppOauthAccessScope>
<ConnectedAppOauthAccessScope>OfflineAccess</ConnectedAppOauthAccessScope>
</scopes>
</oauthConfig>
</ConnectedApp>
</createMetadata>
</Body>
</Envelope>`.replace(/\n/g, '');

    return fetch(metadataUrl, {
        method: 'POST',
        headers: headers,
        body: soapTemplate,
  });
}

export {_generateConsumerKey, _generateConsumerSecret, createConnectedApp};
