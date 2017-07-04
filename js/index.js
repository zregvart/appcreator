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
 * Performs the bulk of setting up for Fuse.
 *
 * @param {string} metadataUrl - URL to the SOAP Metadata API port
 * @param {string} sessionId   - Salesforce sessionId used for authentication
 * @return {Promise} resulting Promise
 */
export function setup(metadataUrl, sessionId) {
  let metadata = new Metadata(metadataUrl, sessionId);

  return metadata.deleteConnectedApp().then(() => {
    return metadata.createConnectedApp();
  });
};
