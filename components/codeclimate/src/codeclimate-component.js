'use strict';

const Spinner = require('run-jst/src/component/helper/spinner');
const mainEvents = require('run-jst/src/events');
const testEvents = require('run-jst/src/component/test/events');
const coverageEvents = require('run-jst/src/component/coverage/events');
const DependantConfigBasedComponent = require('run-jst/src/component/dependant-config-based-component');
const Formatter = require('codeclimate-test-reporter/formatter');
const pify = require('pify');
const CodeclimateClient = require('./codeclimate-client');

/**
 * CodeClimate component
 */
class CodeclimateComponent extends DependantConfigBasedComponent {
  /**
   * @param {*} args
   */
  constructor(...args) {
    super(...args);
    
    this._lcovBuffer = '';
  }
  
  /**
   * @returns {string}
   */
  get name() {
    return 'codeclimate';
  }
  
  /**
   * @returns {string[]}
   */
  get dependencies() {
    return [ 'coverage' ];
  }
  
  /**
   * @param {Emitter} emitter
   * 
   * @returns {Promise}
   */
  run(emitter) {
    return new Promise((resolve, reject) => {
      emitter.onBlocking(coverageEvents.coverage.report.create, (...args) => {
        this._hookReporter(...args);
        
        emitter.on(testEvents.assets.test.end, () => {
          const formatter = new Formatter();
          
          pify(formatter.format.bind(formatter))(this._lcovBuffer)
            .then(json => {
              this.logger.debug(JSON.stringify(json, null, '  '));
              
              const token = this.container.get('token', '');
              const skipCertificate = this.container.get('skip-certificate', false);
              const client = new CodeclimateClient(token, skipCertificate);
              const spinner = new Spinner(`Uploading coverage data uploaded to CodeClimate`);
              
              return spinner.then(
                'Coverage data uploaded to CodeClimate.'
              ).catch(
                'Coverage data uploaded to CodeClimate failed.'
              ).promise(client.upload(json));
            })
            .then(() => resolve())
            .catch(error => reject(error));
        });
        
        return Promise.resolve();
      });
    });
  }
  
  /**
   * @param {istanbul} istanbul
   * @param {istanbul.Reporter} reporter
   *
   * @private
   */
  _hookReporter(istanbul, reporter) {
    const lcovReport = istanbul.Report.create(
      CodeclimateComponent.ISTANBUL_REPORTER, 
      { log: this._logFn.bind(this) }
    );
    
    reporter.reports[CodeclimateComponent.ISTANBUL_REPORTER] = lcovReport;
  }
  
  /**
   * @param {string} ln
   *
   * @private
   */
  _logFn(ln) {
    this._lcovBuffer += `${ ln }\n`;
  }
  
  /**
   * @returns {string}
   */
  static get ISTANBUL_REPORTER() {
    return 'text-lcov';
  }
}

module.exports = CodeclimateComponent;
