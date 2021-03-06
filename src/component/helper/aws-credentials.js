'use strict';

const AWS = require('aws-sdk');

/**
 * AWS security credentials
 */
class AwsCredentials {
  /**
   * @param {Object} options
   */
  constructor(options = {}) {
    this._options = options;
    this._providers = [
      new AWS.EnvironmentCredentials(
        this._options.hasOwnProperty('envPrefix') ? this._options.envPrefix : 'AWS'
      ),
      new AWS.SharedIniFileCredentials({
        profile: this._options.hasOwnProperty('profile') ? this._options.profile : 'default'
      }),
      AWS.ECSCredentials.prototype.isConfiguredForEcsCredentials()
        ? new AWS.ECSCredentials() : new AWS.EC2MetadataCredentials()
    ];

    if (this._options.hasOwnProperty('accessKeyId') && this._options.hasOwnProperty('secretAccessKey')) {
      this._providers.push(
        new AWS.Credentials({
          accessKeyId: this._options.accessKeyId,
          secretAccessKey: this._options.secretAccessKey
        })
      );
    }
  }

  /**
   * Get AWS Configuration
   * @return {Promise}
   */
  getConfig() {
    return new AWS.CredentialProviderChain(this._providers).resolvePromise().then(credentials => {
      let roleArn = this._getRoleArn();

      AWS.config.credentials = roleArn
        ? new AWS.TemporaryCredentials({ RoleArn: roleArn }, credentials)
        : credentials;

      if (this._options.hasOwnProperty('region')) {
        AWS.config.update({ region: this._options.region });
      }

      return Promise.resolve(AWS);
    });
  }

  /**
   * Compose and validate Role ARN
   * @return {boolean}
   * @private
   */
  _getRoleArn() {
    let roleArn = this._options.roleArn;

    if (this._options.hasOwnProperty('accountId') && this._options.hasOwnProperty('roleName')) {
      roleArn = `arn:aws:iam::${this._options.accountId}:role/${this._options.roleName}`
    }

    return /^arn:aws:iam::[0-9]{12}:role\/[a-zA-Z0-9+=,.@\-_]*$/.test(roleArn) ? roleArn : false;
  }
}

module.exports = AwsCredentials;
