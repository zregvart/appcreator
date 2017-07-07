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

import Metadata from '../metadata.js';
import trim from '../util.js';

const METADATA_URL = 'https://metadata.url';

const DEFAULT_RESPONSE = trim(
  `<?xml version="1.0" encoding="UTF-8"?>
    <result>
      <success>true</success>
    </result>`);

global.fetch = require('jest-fetch-mock');

beforeEach(() => {
  return jest.clearAllMocks();
});

expect.extend({
  toBeSoapInvocation(received, argument) {
    const ary = Array.isArray(argument) ? argument : [argument];

    ary.forEach((e, i) => {
      expect(received).toHaveBeenCalledWith(e.endpoint, {
        method: 'POST',
        headers: {
          map: {
            'content-type': ['text/xml'],
            'soapaction': [e.action],
          },
        },
        body: expect.anything(),
      });

      const options = fetch.mock.calls[i][1];
      const body = trim(e.body);
      expect(options.body).toBe(trim(
      `<Envelope xmlns=\"http://schemas.xmlsoap.org/soap/envelope/\">
        <Header>
          <SessionHeader xmlns=\"http://soap.sforce.com/2006/04/metadata\">
            <sessionId>${metadata.sessionId}</sessionId>
          </SessionHeader>
          <CallOptions xmlns=\"http://soap.sforce.com/2006/04/metadata\">
            <client>JBoss Fuse</client>
          </CallOptions>
        </Header>
        <Body>${body}</Body>
      </Envelope>`));
    });

    return {actual: received, message: '', pass: true};
  },
});

const metadata = new Metadata('https://metadata.url', 'sessionId');

describe('Salesforce metadata', () => {
  it('Should generate OAuth consumer keys', () => {
    global.crypto = {
      getRandomValues: jest.fn(),
    };

    expect(metadata._generateConsumerKey()).toMatch(/.{64,}/);
  });

  it('Should generate OAuth consumer secrets', () => {
    global.crypto = {
      getRandomValues: jest.fn((ary) => ary[0] = 1000000001),
    };

    expect(metadata._generateConsumerSecret()).toMatch(/[0-9]{10,}/);
  });

  it('Should create Salesforce Connected App', () => {
    fetch.mockResponseOnce(DEFAULT_RESPONSE, {
      status: 201,
    });

    return metadata.createConnectedApp({
      consumerKey: '_consumerKey_',
      consumerSecret: '_consumerSecret_',
    }).then((data) => {
      expect(data).toMatchObject({
        consumerKey: '_consumerKey_',
        consumerSecret: '_consumerSecret_',
      });

      expect(fetch).toBeSoapInvocation({
        endpoint: METADATA_URL,
        action: 'createMetadata',
        body:
        `<createMetadata xmlns="http://soap.sforce.com/2006/04/metadata">
          <metadata xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="ConnectedApp">
          <fullName>FuseApp</fullName>
          <contactEmail>support@redhat.com</contactEmail>
          <description>Salesforce Connected App used for integration with RedHat Fuse middleware.</description>
          <infoUrl>https://www.redhat.com/en/technologies/jboss-middleware/fuse</infoUrl>
          <label>FuseApp</label>
          <oauthConfig>
            <callbackUrl>https://login.salesforce.com/services/oauth2/success</callbackUrl>
            <consumerKey>_consumerKey_</consumerKey>
            <consumerSecret>_consumerSecret_</consumerSecret>
            <scopes>Api</scopes>
            <scopes>RefreshToken</scopes>
            <scopes>OfflineAccess</scopes>
            </oauthConfig></metadata>
          </createMetadata>`,
      });
    });
  });

  it('Should throw an error if failed to create Salesforce Connected App', () => {
    global.fetch = require('jest-fetch-mock');

    fetch.mockResponseOnce(DEFAULT_RESPONSE, {
      status: 500,
      statusText: 'Difficult lemon',
    });

    return metadata.createConnectedApp().catch((e) =>
      expect(e).toEqual(new Error('Unable to create Connected App: 500: Difficult lemon'))
    );
  });

  it('Should invoke metadata service via SOAP', () => {
    fetch.mockResponseOnce(DEFAULT_RESPONSE, {
      status: 200,
    });

    return metadata._invokeMetadataOperation('_action_', '_body_').then(() => {
      expect(fetch).toBeSoapInvocation({
        endpoint: METADATA_URL,
        action: '_action_',
        body: '_body_',
      });
    });
  });

  it('Should fetch text from nodes in XML', () => {
    let xml = '<a><b>bbb</b><c>ccc</c><c>ddd</c></a>';

    expect(metadata._nodeValues(xml, 'b')).toEqual('bbb');
    expect(metadata._nodeValues(xml, 'c')).toEqual(['ccc', 'ddd']);
  });

  it('Should fetch fail to fetch text from nonexistant nodes in XML', () => {
    let xml = '<a><b>bbb</b><c>ccc</c></a>';
    let parser = new DOMParser();
    let doc = parser.parseFromString(xml, 'text/xml');

    expect(metadata._nodeValues(doc, 'z')).toBeUndefined();
  });

  it('Should handle SOAP return statuses', () => {
    fetch.mockResponseOnce(trim(
      `<?xml version="1.0" encoding="UTF-8"?>
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns="http://soap.sforce.com/2006/04/metadata">
        <soapenv:Body>
          <createMetadataResponse>
            <result>
              <errors>
                <message>error!</message>
                <statusCode>ERROR</statusCode>
              </errors>
              <success>false</success>
            </result>
          </createMetadataResponse>
        </soapenv:Body>
      </soapenv:Envelope>`), {
      status: 200,
    });

    return metadata._invokeMetadataOperation('_action_', '_body_').then(() => {
      throw new Error('No exception thrown!');
    }).catch((e) => expect(e).toMatchObject({
      message: 'ERROR: error!',
      statusCode: 'ERROR',
      detail: 'error!',
    }));
  });
});
