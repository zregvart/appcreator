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

import * as metadata from '../metadata.js';

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
        global.fetch = require('jest-fetch-mock');

        metadata.createConnectedApp('https://metadata.url', 'sessionId', {
            consumerKey: '_consumerKey_',
            consumerSecret: '_consumerSecret_',
        }).then(() => {
            expect(fetch).toHaveBeenCalledWith('https://metadata.url', {
                method: 'POST',
                headers: {
                    map: {
                        'content-type': ['text/xml'],
                        'soapaction': ['createMetadata'],
                    },
                },
                body: expect.anything(),
            });
        });

        const options = fetch.mock.calls[0][1];
        expect(options.body).toBe(
`<Envelope xmlns=\"http://schemas.xmlsoap.org/soap/envelope/\">
<Header>
<SessionHeader xmlns=\"http://soap.sforce.com/2006/04/metadata\">
<sessionId>sessionId</sessionId>
</SessionHeader>
<CallOptions xmlns=\"http://soap.sforce.com/2006/04/metadata\">
<client>Syndesis</client>
</CallOptions>
</Header>
<Body>
<createMetadata xmlns=\"http://soap.sforce.com/2006/04/metadata\">
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
<consumerKey>_consumerKey_</consumerKey>
<consumerSecret>_consumerSecret_</consumerSecret>
<scopes>
<ConnectedAppOauthAccessScope>Api</ConnectedAppOauthAccessScope>
<ConnectedAppOauthAccessScope>RefreshToken</ConnectedAppOauthAccessScope>
<ConnectedAppOauthAccessScope>OfflineAccess</ConnectedAppOauthAccessScope>
</scopes>
</oauthConfig>
</ConnectedApp>
</createMetadata>
</Body>
</Envelope>`.replace(/\n/g, ''));
    });
});
