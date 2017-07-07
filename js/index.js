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

import Metadata from './metadata.js';

/**
 * Performs setting up connected app.
 */
export default class Setup {
  /**
   * Constructs new Metadata object.
   *
   * @param {string} metadataUrl - URL to the SOAP Metadata endpoint
   * @param {string} sessionId   - sessionId used for authentication
   */
  constructor(metadataUrl, sessionId) {
    this._metadata = new Metadata(metadataUrl, sessionId);
  }

  /**
   * Setup of the connected app.
   *
   * @return {Promise} - the resulting Promise of connected app creation
   */
  setup() {
    return this._metadata.createConnectedApp();
  };

  /**
   * Determines if the setup has been performed.
   * @return {Promise}  - Promise that resolves to true if setup has been performed
   */
  isSetup() {
    return this._metadata.connectedAppExists();
  }
}
