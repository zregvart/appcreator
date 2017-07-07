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

import Setup from '../index.js';

jest.mock('../metadata');

import Metadata from '../metadata.js';

const metadata = new Metadata();

const setup = new Setup('https://metadata.url', 'sessionId');
setup._metadata = metadata;

metadata.createConnectedApp.mockImplementation(() => Promise.resolve({
  consumerKey: '_consumerKey_',
  consumerSecret: '_consumerSecret_',
}));

describe('Setup', () => {
  it('Should setup connected app', () => {
    metadata.connectedAppExists.mockImplementation(() => Promise.resolve(false));

    return setup.setup().then((data) => {
      expect(metadata.createConnectedApp).toBeCalled();

      expect(data).toMatchObject({
        consumerKey: '_consumerKey_',
        consumerSecret: '_consumerSecret_',
      });
    });
  });

  it('Should determine if connected app has been created', () => {
    metadata.connectedAppExists.mockImplementation(() => Promise.resolve(true));

    return setup.isSetup().then((isSetup) => {
      expect(metadata.connectedAppExists).toBeCalled();

      expect(isSetup).toEqual(true);
    });
  });
});
